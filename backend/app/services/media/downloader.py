import os
import re
import shutil
import logging
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

        # Facebook Ad Library URLs cannot be directly downloaded without headless session / specific auth
        if source_type == SourceType.FACEBOOK_AD_LIBRARY:
            raise RuntimeError(FALLBACK_ERROR_MESSAGE)

        # Direct HTTP media URL
        if source_type == SourceType.DIRECT_URL and any(url.lower().endswith(ext) for ext in [".mp4", ".mp3", ".wav", ".m4a", ".webm"]):
            return await self._download_direct_url(url, source_type)

        # Attempt download using yt-dlp for supported platforms (YouTube, Shorts, supported public reels/videos)
        return await self._download_with_ytdlp(url, source_type)

    async def _download_direct_url(self, url: str, source_type: SourceType) -> Dict[str, Any]:
        try:
            filename = url.split("/")[-1].split("?")[0]
            if not filename or "." not in filename:
                filename = "downloaded_media.mp4"
            
            output_path = self.download_dir / f"direct_{int(os.times().elapsed)}_{filename}"

            async with httpx.AsyncClient(follow_redirects=True, timeout=120.0) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        raise RuntimeError(FALLBACK_ERROR_MESSAGE)
                    
                    with open(output_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=1024 * 64):
                            f.write(chunk)

            title = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()
            return {
                "file_path": str(output_path),
                "title": title,
                "duration": 0.0,
                "source_type": source_type.value,
                "mime_type": "video/mp4" if output_path.suffix in [".mp4", ".mov", ".webm"] else "audio/mpeg"
            }
        except Exception as e:
            logger.error(f"Direct URL download failed: {e}")
            raise RuntimeError(FALLBACK_ERROR_MESSAGE)

    async def _download_with_ytdlp(self, url: str, source_type: SourceType) -> Dict[str, Any]:
        try:
            import yt_dlp

            out_template = str(self.download_dir / "%(id)s_%(title).50s.%(ext)s")
            ffmpeg_path = self.processor.ffmpeg_exe

            node_path = shutil.which("node")
            js_runtimes = {"node": {"path": node_path}} if node_path else {}

            ydl_opts = {
                "format": "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]/best[ext=mp4]/best",
                "outtmpl": out_template,
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
                "extract_flat": False,
                "socket_timeout": 30,
                "ffmpeg_location": ffmpeg_path,
                "js_runtimes": js_runtimes,
                "postprocessors": [{
                    "key": "FFmpegVideoConvertor",
                    "preferedformat": "mp4",
                }] if ffmpeg_path else [],
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=True)
                except Exception as dl_err:
                    logger.warning(f"yt-dlp primary download failed: {dl_err}. Retrying with generic best format...")
                    # Fallback retry without postprocessor constraints
                    fallback_opts = {
                        "format": "best",
                        "outtmpl": out_template,
                        "quiet": True,
                        "no_warnings": True,
                        "noplaylist": True,
                        "socket_timeout": 30,
                        "ffmpeg_location": ffmpeg_path,
                        "js_runtimes": js_runtimes,
                    }
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
