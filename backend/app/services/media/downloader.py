import os
import re
import shutil
import logging
import asyncio
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.services.media.detector import PlatformDetector
from app.services.media.processor import MediaProcessor
from app.models.media import SourceType

logger = logging.getLogger(__name__)

FALLBACK_ERROR_MESSAGE = "Direct processing isn't available for this URL. Please download the video and upload the file instead."


class MediaDownloader:
    """Downloads media from external URLs using yt-dlp or direct streaming."""

    def __init__(self):
        self.download_dir = Path(settings.TEMP_DIR_PATH)
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.processor = MediaProcessor()

    async def download(self, url: str) -> Dict[str, Any]:
        """
        Attempts to download media from URL.
        Returns metadata: { 'file_path': str, 'title': str, 'duration': float, 'source_type': SourceType, 'mime_type': str }
        Raises RuntimeError with user-friendly message if platform cannot be processed directly.
        """
        source_type, platform_name = PlatformDetector.detect(url)

        # Facebook Ad Library URLs: extract real video URL via Playwright network sniffer
        if source_type == SourceType.FACEBOOK_AD_LIBRARY or "facebook.com/ads/library" in url.lower():
            logger.info(f"Extracting video from Facebook Ad Library using headless sniffer: {url}")
            extracted_media_url = await self._extract_fb_ad_library_video(url)
            if not extracted_media_url:
                raise RuntimeError("Could not locate a playable video in this Facebook Ad. Please verify that this ad contains a video.")
            logger.info("Successfully extracted video URL from FB Ad Library. Downloading stream...")
            return await self._download_direct_url(extracted_media_url, source_type)

        # Direct HTTP media URL (checking extension before query parameters or CDN domains)
        clean_url_base = url.split("?")[0].split("#")[0].lower()
        is_direct = (
            source_type == SourceType.DIRECT_URL
            or "fbcdn.net" in url.lower()
            or any(clean_url_base.endswith(ext) for ext in [".mp4", ".mp3", ".wav", ".m4a", ".webm", ".mov", ".m4v"])
        )
        if is_direct:
            return await self._download_direct_url(url, source_type)

        # Attempt download using yt-dlp for supported platforms (YouTube, Shorts, supported public reels/videos)
        return await self._download_with_ytdlp(url, source_type)

    def _extract_fb_sync(self, ad_url: str) -> Optional[str]:
        """
        Runs headless Playwright in an isolated standalone subprocess to sniff the direct CDN video URL
        from the Facebook Ad Library page. Running in a dedicated subprocess guarantees
        complete independence from Uvicorn and Windows asyncio event loop policies.
        """
        try:
            sniffer_script = Path(__file__).parent / "fb_sniffer.py"
            cmd = [sys.executable, str(sniffer_script), ad_url]
            logger.info(f"Launching FB sniffer subprocess for {ad_url}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
            
            # Find JSON output line
            for line in reversed(result.stdout.strip().splitlines()):
                line = line.strip()
                if line.startswith("{") and line.endswith("}"):
                    try:
                        data = json.loads(line)
                        if data.get("success") and data.get("url"):
                            return data["url"]
                        elif not data.get("success"):
                            logger.warning(f"FB sniffer reported failure: {data.get('error')}")
                    except Exception:
                        pass

            err_detail = result.stderr.strip() or result.stdout.strip()
            logger.warning(f"FB sniffer did not return success. Stdout: {result.stdout[:200]} | Stderr: {result.stderr[:300]}")
            return None
        except Exception as e:
            logger.error(f"Playwright FB Ad Library extraction error: {type(e).__name__}: {e}", exc_info=True)
            return None

    async def _extract_fb_ad_library_video(self, ad_url: str) -> Optional[str]:
        """
        Uses Playwright headless browser to intercept and capture direct video stream URL
        from Facebook Ad Library page without requiring manual user extraction.
        Offloads to worker thread to ensure Windows compatibility without asyncio subprocess issues.
        """
        return await asyncio.to_thread(self._extract_fb_sync, ad_url)

    async def _download_direct_url(self, url: str, source_type: SourceType) -> Dict[str, Any]:
        try:
            import hashlib
            import time

            clean_url_base = url.split("?")[0].split("#")[0]
            raw_filename = clean_url_base.split("/")[-1]
            ext = ".mp4"
            for possible_ext in [".mp4", ".mp3", ".wav", ".m4a", ".webm", ".mov", ".m4v"]:
                if clean_url_base.lower().endswith(possible_ext):
                    ext = possible_ext
                    break

            # Short safe filename to prevent Windows MAX_PATH errors
            safe_hash = hashlib.md5(url.encode("utf-8")).hexdigest()[:8]
            base_clean = re.sub(r'[^a-zA-Z0-9_\-]', '', raw_filename.rsplit(".", 1)[0])[:30] or "video"
            safe_filename = f"direct_{int(time.time())}_{safe_hash}_{base_clean}{ext}"

            output_path = self.download_dir / safe_filename

            download_headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Referer": "https://www.facebook.com/",
            }

            async with httpx.AsyncClient(follow_redirects=True, headers=download_headers, timeout=180.0) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        logger.error(f"Direct stream download failed with status: {response.status_code}")
                        raise RuntimeError(FALLBACK_ERROR_MESSAGE)

                    with open(output_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=1024 * 64):
                            f.write(chunk)

            title = "Facebook Ad Video" if source_type == SourceType.FACEBOOK_AD_LIBRARY else (base_clean.replace("_", " ").title() if base_clean != "video" else "Direct Video")
            duration = 0.0
            try:
                meta = self.processor.get_media_metadata(str(output_path))
                duration = float(meta.get("duration", 0.0) or 0.0)
            except Exception as meta_err:
                logger.warning(f"Could not extract duration from direct media: {meta_err}")

            return {
                "file_path": str(output_path),
                "title": title,
                "duration": duration,
                "source_type": source_type.value,
                "mime_type": "video/mp4" if output_path.suffix.lower() in [".mp4", ".mov", ".webm", ".m4v"] else "audio/mpeg"
            }
        except Exception as e:
            logger.error(f"Direct URL download failed: {e}")
            raise RuntimeError(FALLBACK_ERROR_MESSAGE)

    async def _download_with_ytdlp(self, url: str, source_type: SourceType) -> Dict[str, Any]:
        try:
            import yt_dlp

            out_template = str(self.download_dir / "%(id).30s_%(title).40s.%(ext)s")
            ffmpeg_path = self.processor.ffmpeg_exe

            node_path = shutil.which("node")
            js_runtimes = {"node": {"path": node_path}} if node_path else {}

            cookiefile_path = None
            raw_cookies = getattr(settings, "YOUTUBE_COOKIES", None) or os.environ.get("YOUTUBE_COOKIES")
            if raw_cookies and len(raw_cookies.strip()) > 10:
                cookiefile_path = str(self.download_dir / "youtube_cookies.txt")
                try:
                    # Render environment variables escape newlines as literal \n, restore actual newlines and tabs
                    clean_cookies = raw_cookies.replace("\\n", "\n").replace("\\t", "\t").strip()
                    with open(cookiefile_path, "w", encoding="utf-8") as cf:
                        cf.write(clean_cookies)
                    logger.info(f"Loaded YouTube cookies ({len(clean_cookies)} bytes) for authenticated download.")
                except Exception as c_err:
                    logger.warning(f"Could not write youtube_cookies.txt: {c_err}")
                    cookiefile_path = None

            # When cookies are provided, use standard web client matching the cookies; otherwise use android
            client_list = ["web"] if cookiefile_path else ["android"]

            ydl_opts = {
                "format": "bestvideo[height<=720]+bestaudio/best[height<=720]/best" if cookiefile_path else "18/bestvideo[height<=720]+bestaudio/best[height<=720]/best",
                "outtmpl": out_template,
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
                "extract_flat": False,
                "socket_timeout": 30,
                "ffmpeg_location": ffmpeg_path,
                "js_runtimes": js_runtimes,
                "extractor_args": {
                    "youtube": {
                        "player_client": client_list
                    }
                },
                "postprocessors": [{
                    "key": "FFmpegVideoConvertor",
                    "preferedformat": "mp4",
                }] if ffmpeg_path else [],
            }
            if cookiefile_path:
                ydl_opts["cookiefile"] = cookiefile_path

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=True)
                except Exception as dl_err:
                    logger.warning(f"yt-dlp primary download failed: {dl_err}. Retrying with fallback...")
                    # Fallback retry without postprocessor constraints
                    fallback_opts = {
                        "format": "best" if cookiefile_path else "18/best",
                        "outtmpl": out_template,
                        "quiet": True,
                        "no_warnings": True,
                        "noplaylist": True,
                        "socket_timeout": 30,
                        "ffmpeg_location": ffmpeg_path,
                        "js_runtimes": js_runtimes,
                        "extractor_args": {
                            "youtube": {
                                "player_client": client_list
                            }
                        },
                    }
                    if cookiefile_path:
                        fallback_opts["cookiefile"] = cookiefile_path
                    with yt_dlp.YoutubeDL(fallback_opts) as fallback_ydl:
                        info = fallback_ydl.extract_info(url, download=True)

                if not info:
                    raise RuntimeError(FALLBACK_ERROR_MESSAGE)

                downloaded_file = ydl.prepare_filename(info)
                # Handle possible extension change during merging
                if not os.path.exists(downloaded_file):
                    stem = Path(downloaded_file).stem
                    candidates = list(self.download_dir.glob(f"{stem}*"))
                    if candidates:
                        downloaded_file = str(candidates[0])
                    else:
                        raise RuntimeError(FALLBACK_ERROR_MESSAGE)

                title = info.get("title") or "Online Video"
                duration = float(info.get("duration") or 0.0)
                ext = Path(downloaded_file).suffix.lower()
                mime_type = "video/mp4" if ext in [".mp4", ".mkv", ".webm", ".mov"] else "audio/mpeg"

                return {
                    "file_path": downloaded_file,
                    "title": title,
                    "duration": duration,
                    "source_type": source_type.value,
                    "mime_type": mime_type
                }
        except RuntimeError:
            raise
        except Exception as e:
            logger.error(f"ytdlp processing error: {e}")
            raise RuntimeError(FALLBACK_ERROR_MESSAGE)
