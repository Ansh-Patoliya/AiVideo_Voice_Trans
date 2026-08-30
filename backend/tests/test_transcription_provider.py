import pytest
from unittest.mock import patch, MagicMock
from app.core.config import settings
from app.services.transcription.base import (
    TranscriptionProvider,
    TranscriptionResult,
    TranscriptSegmentData,
)
from app.services.transcription.provider_factory import TranscriptionProviderFactory
from app.services.transcription.gemini import GeminiTranscriptionProvider


class MockCustomTranscriptionProvider(TranscriptionProvider):
    async def transcribe(self, audio_path: str, language_hint=None, offset_seconds=0.0):
        return TranscriptionResult(
            language="en",
            full_text="Test dialogue from mock provider.",
            segments=[
                TranscriptSegmentData(
                    start_time=round(0.0 + offset_seconds, 2),
                    end_time=round(3.5 + offset_seconds, 2),
                    text="Test dialogue from mock provider.",
                    speaker="Speaker 1",
                    sequence=0
                )
            ]
        )

    async def detect_language(self, audio_path: str) -> str:
        return "en"


def test_provider_model_configuration():
    """Verify GeminiTranscriptionProvider uses gemini-3.5-flash by default."""
    provider = GeminiTranscriptionProvider(api_key="mock_key")
    assert provider.model_name == "gemini-3.5-flash"


def test_provider_registration_and_factory():
    """Verify provider registration via factory."""
    TranscriptionProviderFactory.register_provider("mock", MockCustomTranscriptionProvider)
    provider = TranscriptionProviderFactory.get_provider("mock")
    assert isinstance(provider, MockCustomTranscriptionProvider)


def test_gemini_json_parsing_and_timestamps():
    """Verify millisecond timestamps and JSON formatting."""
    provider = GeminiTranscriptionProvider(api_key="fake-key-for-unit-test")
    raw_response = """
    ```json
    {
      "language": "en-AU",
      "segments": [
        {
          "start_time": 1.254,
          "end_time": 5.508,
          "text": "G'day mate, welcome to the Sydney studio.",
          "speaker": "spk_1"
        }
      ]
    }
    ```
    """
    parsed = provider._parse_json_response(raw_response)
    assert parsed["language"] == "en-AU"
    assert len(parsed["segments"]) == 1
    assert parsed["segments"][0]["start_time"] == 1.254
    assert parsed["segments"][0]["text"] == "G'day mate, welcome to the Sydney studio."


def test_speaker_normalization():
    """Verify speaker diarization maps identifiers to clean Speaker N format."""
    provider = GeminiTranscriptionProvider(api_key="fake-key")
    assert provider._normalize_speaker_label("spk_1") == "Speaker 1"
    assert provider._normalize_speaker_label("spk_0") == "Speaker 1"
    assert provider._normalize_speaker_label("speaker_2") == "Speaker 2"
    assert provider._normalize_speaker_label("Speaker 3") == "Speaker 3"
    assert provider._normalize_speaker_label(None) is None
    assert provider._normalize_speaker_label("null") is None
    assert provider._normalize_speaker_label("") is None


@pytest.mark.asyncio
async def test_chunk_offset_arithmetic():
    """Verify chunk timestamp + chunk offset = final timestamp."""
    provider = GeminiTranscriptionProvider(api_key="fake-key")
    
    mock_json = """
    {
      "language": "en",
      "segments": [
        {
          "start_time": 2.50,
          "end_time": 6.80,
          "text": "This is segment in chunk 2.",
          "speaker": "Speaker 1"
        }
      ]
    }
    """
    
    with patch.object(provider, "_call_gemini_api", return_value=mock_json):
        with patch("pathlib.Path.exists", return_value=True):
            # Chunk 2 with 1800s (30m) offset
            result = await provider.transcribe("fake_audio.wav", offset_seconds=1800.0)
            assert len(result.segments) == 1
            # 2.50 + 1800.0 = 1802.50
            assert result.segments[0].start_time == 1802.50
            # 6.80 + 1800.0 = 1806.80
            assert result.segments[0].end_time == 1806.80


@pytest.mark.asyncio
async def test_multi_chunk_merging_simulation():
    """Simulate multiple chunks and verify sequential ordering."""
    provider = GeminiTranscriptionProvider(api_key="fake-key")
    
    mock_chunk_1 = """
    {
      "language": "en-AU",
      "segments": [
        {"start_time": 0.0, "end_time": 5.0, "text": "First chunk line 1."},
        {"start_time": 5.1, "end_time": 10.0, "text": "First chunk line 2."}
      ]
    }
    """
    mock_chunk_2 = """
    {
      "language": "en-AU",
      "segments": [
        {"start_time": 1.0, "end_time": 6.0, "text": "Second chunk line 1."}
      ]
    }
    """

    with patch("pathlib.Path.exists", return_value=True):
        with patch.object(provider, "_call_gemini_api", side_effect=[mock_chunk_1, mock_chunk_2]):
            res1 = await provider.transcribe("chunk1.wav", offset_seconds=0.0)
            res2 = await provider.transcribe("chunk2.wav", offset_seconds=30.0)

            all_segs = res1.segments + res2.segments
            assert len(all_segs) == 3
            assert all_segs[0].start_time == 0.0
            assert all_segs[1].start_time == 5.1
            assert all_segs[2].start_time == 31.0  # 1.0 + 30.0 offset


@pytest.mark.asyncio
async def test_error_handling_graceful_failure():
    """Verify Gemini API failure raises a clean error instead of crashing."""
    provider = GeminiTranscriptionProvider(api_key="fake-key")
    
    with patch.object(provider, "_call_gemini_api", side_effect=Exception("API connection timeout")):
        with patch("pathlib.Path.exists", return_value=True):
            with pytest.raises(RuntimeError) as exc_info:
                await provider.transcribe("audio.wav")
            assert "Gemini transcription failed after 3 attempts" in str(exc_info.value)
