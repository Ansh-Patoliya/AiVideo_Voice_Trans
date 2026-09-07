import os
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import cloudinary
import cloudinary.uploader
from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Manages cloud media storage with Cloudinary and local static fallback."""

    def __init__(self):
        self.has_cloudinary = bool(
            settings.CLOUDINARY_CLOUD_NAME and
            settings.CLOUDINARY_API_KEY and
            settings.CLOUDINARY_API_SECRET
        )
        if self.has_cloudinary:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )
            logger.info("Cloudinary storage initialized.")
        else:
            logger.info("Cloudinary credentials not provided. Using local storage fallback.")

    def _compress_video_for_upload(self, input_path: Path) -> Optional[Path]:
        """Compresses large video (720p / crf 28 / ultrafast) so it stays safely under Cloudinary's 100MB limit."""
        try:
            import subprocess
            from app.services.media.processor import MediaProcessor
            ffmpeg_exe = MediaProcessor().ffmpeg_exe

            opt_path = Path(settings.TEMP_DIR_PATH) / f"{input_path.stem}_cloud_opt.mp4"
            cmd = [
                ffmpeg_exe,
                "-y",
                "-i", str(input_path),
                "-vf", "scale='min(1280,iw)':-2",
                "-c:v", "libx264",
                "-crf", "28",
                "-preset", "ultrafast",
                "-c:a", "aac",
                "-b:a", "96k",
                str(opt_path)
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0 and opt_path.exists():
                return opt_path
            else:
                logger.warning(f"Video compression warning: {res.stderr[:200]}")
        except Exception as e:
            logger.warning(f"Video compression failed: {e}")
        return None

    def upload_file(self, file_path: str, media_type: str = "video") -> Dict[str, Any]:
        """
        Uploads a media file to Cloudinary or copies it to local permanent media store.
        Returns: { 'public_id': str, 'url': str, 'local_path': str, 'bytes': int, 'format': str }
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = path.stat().st_size

        target_upload_path = path
        temp_compressed: Optional[Path] = None

        if self.has_cloudinary:
            try:
                # If video > 90MB, automatically compress so it fits Cloudinary 100MB free tier
                upload_bytes = file_size
                if media_type == "video" and file_size > 90_000_000:
                    logger.info(f"Video size ({file_size / (1024 * 1024):.1f}MB) > 90MB. Compressing for Cloudinary...")
                    temp_compressed = self._compress_video_for_upload(path)
                    if temp_compressed and temp_compressed.exists() and temp_compressed.stat().st_size < file_size:
                        target_upload_path = temp_compressed
                        upload_bytes = temp_compressed.stat().st_size
                        logger.info(f"Compressed for Cloudinary: {file_size / (1024 * 1024):.1f}MB -> {upload_bytes / (1024 * 1024):.1f}MB")

                resource_type = "video" if media_type == "video" else "auto"
                upload_func = cloudinary.uploader.upload_large if (media_type == "video" or upload_bytes > 15_000_000) else cloudinary.uploader.upload
                result = upload_func(
                    str(target_upload_path),
                    resource_type=resource_type,
                    folder="aivideo_transcriber",
                    use_filename=True,
                    unique_filename=True
                )
                
                # Cleanup temp compressed video
                if temp_compressed and temp_compressed.exists() and temp_compressed != path:
                    try:
                        temp_compressed.unlink()
                    except Exception:
                        pass

                return {
                    "public_id": result.get("public_id"),
                    "url": result.get("secure_url") or result.get("url"),
                    "local_path": str(path),
                    "bytes": result.get("bytes", upload_bytes),
                    "format": result.get("format", path.suffix.lstrip(".")),
                    "duration": result.get("duration", 0.0)
                }
            except Exception as e:
                # Cleanup temp compressed video on error
                if temp_compressed and temp_compressed.exists() and temp_compressed != path:
                    try:
                        temp_compressed.unlink()
                    except Exception:
                        pass

                err_msg = str(e)
                if "File size too large" in err_msg or "104857600" in err_msg:
                    logger.warning(
                        f"File size ({file_size / (1024 * 1024):.1f}MB) exceeds Cloudinary Free Tier limit (100MB). "
                        f"Falling back to local storage streaming."
                    )
                else:
                    logger.error(f"Cloudinary upload failed: {e}. Falling back to local storage.")

        # Local storage fallback
        dest_dir = Path(settings.LOCAL_STORAGE_DIR)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / f"{path.stem}_{int(os.times().elapsed)}{path.suffix}"
        
        if str(path.resolve()) != str(dest_file.resolve()):
            shutil.copy2(path, dest_file)

        # In local mode, API serves static files at /media_storage/<filename>
        local_url = f"{settings.API_V1_STR}/media/stream/{dest_file.name}"

        return {
            "public_id": dest_file.stem,
            "url": local_url,
            "local_path": str(dest_file),
            "bytes": file_size,
            "format": dest_file.suffix.lstrip("."),
            "duration": 0.0
        }

    def delete_file(self, public_id: str, local_path: Optional[str] = None):
        """Deletes media from Cloudinary and local filesystem."""
        if self.has_cloudinary and public_id:
            try:
                cloudinary.uploader.destroy(public_id, resource_type="video")
            except Exception as e:
                logger.warning(f"Failed to delete Cloudinary asset {public_id}: {e}")

        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as e:
                logger.warning(f"Failed to delete local file {local_path}: {e}")
