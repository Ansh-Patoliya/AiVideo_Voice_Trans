import pytest
from app.services.media.detector import PlatformDetector
from app.models.media import SourceType


def test_detect_youtube_regular():
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    st, name = PlatformDetector.detect(url)
    assert st == SourceType.YOUTUBE
    assert name == "YouTube"


def test_detect_youtube_shorts():
    url = "https://youtube.com/shorts/abcdef12345"
    st, name = PlatformDetector.detect(url)
    assert st == SourceType.YOUTUBE_SHORTS
    assert name == "YouTube Shorts"


def test_detect_instagram_reel():
    url = "https://www.instagram.com/reel/C1234567890/"
    st, name = PlatformDetector.detect(url)
    assert st == SourceType.INSTAGRAM
    assert name == "Instagram Reel"


def test_detect_facebook_video():
    url = "https://www.facebook.com/watch/?v=9876543210"
    st, name = PlatformDetector.detect(url)
    assert st == SourceType.FACEBOOK
    assert name == "Facebook Video"


def test_detect_facebook_ad_library():
    url = "https://www.facebook.com/ads/library/?id=123456789"
    st, name = PlatformDetector.detect(url)
    assert st == SourceType.FACEBOOK_AD_LIBRARY
    assert name == "Facebook Ad Library"


def test_detect_direct_mp4():
    url = "https://example.com/assets/presentation.mp4"
    st, name = PlatformDetector.detect(url)
    assert st == SourceType.DIRECT_URL
