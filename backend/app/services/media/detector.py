import re
from typing import Tuple
from app.models.media import SourceType


class PlatformDetector:
    """Detects and classifies video/audio source platform from URL."""

    @staticmethod
    def detect(url: str) -> Tuple[SourceType, str]:
        """
        Analyzes URL string and returns (SourceType, normalized_platform_name).
        """
        if not url:
            return SourceType.UPLOAD, "Upload"

        clean_url = url.strip().lower()

        # YouTube Shorts
        if "youtube.com/shorts/" in clean_url or "youtu.be/shorts/" in clean_url:
            return SourceType.YOUTUBE_SHORTS, "YouTube Shorts"

        # YouTube standard
        if "youtube.com" in clean_url or "youtu.be" in clean_url:
            return SourceType.YOUTUBE, "YouTube"

        # Instagram Reels / Posts
        if "instagram.com/reel/" in clean_url or "instagram.com/reels/" in clean_url:
            return SourceType.INSTAGRAM, "Instagram Reel"
        if "instagram.com/p/" in clean_url or "instagram.com/tv/" in clean_url:
            return SourceType.INSTAGRAM, "Instagram Post"

        # Facebook Ad Library
        if "facebook.com/ads/library" in clean_url or "fb.com/ads/library" in clean_url:
            return SourceType.FACEBOOK_AD_LIBRARY, "Facebook Ad Library"

        # Facebook Reels
        if "facebook.com/reel" in clean_url or "fb.watch/reel" in clean_url:
            return SourceType.FACEBOOK, "Facebook Reel"

        # Facebook standard videos
        if "facebook.com" in clean_url or "fb.watch" in clean_url or "fb.com" in clean_url:
            return SourceType.FACEBOOK, "Facebook Video"

        # Direct media URLs (mp4, webm, mp3, etc.)
        if any(clean_url.endswith(ext) or f"{ext}?" in clean_url for ext in [".mp4", ".mp3", ".wav", ".m4a", ".webm", ".mov"]):
            return SourceType.DIRECT_URL, "Direct Media Stream"

        return SourceType.DIRECT_URL, "Web Video"
