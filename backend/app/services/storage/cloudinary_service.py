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

    def upload_file(self, file_path: str, media_type: str = "video") -> Dict[str, Any]:
        """
        Uploads a media file to Cloudinary or copies it to local permanent media store.
        Returns: { 'public_id': str, 'url': str, 'local_path': str, 'bytes': int, 'format': str }
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = path.stat().st_size

        if self.has_cloudinary:
            try:
                resource_type = "video" if media_type == "video" else "auto"
                result = cloudinary.uploader.upload(
                    file_path,
                    resource_type=resource_type,
                    folder="aivideo_transcriber",
                    use_filename=True,
                    unique_filename=True
                )
                
                return {
                    "public_id": result.get("public_id"),
                    "url": result.get("secure_url") or result.get("url"),
                    "local_path": str(path),
                    "bytes": result.get("bytes", file_size),
                    "format": result.get("format", path.suffix.lstrip(".")),
                    "duration": result.get("duration", 0.0)
                }
            except Exception as e:
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
