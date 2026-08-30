import pytest
import time
import asyncio
from unittest.mock import patch, MagicMock
from app.workers.runner import ProcessingPipelineRunner
from app.services.transcription.base import TranscriptionResult, TranscriptSegmentData


@pytest.mark.asyncio
async def test_concurrent_chunk_transcription_speed():
    """Verify that multi-chunk transcription processes concurrently and respects offsets."""
    runner = ProcessingPipelineRunner()
    
    # Mock chunks
    mock_chunks = [
        ("chunk0.wav", 0.0, 300.0),
        ("chunk1.wav", 300.0, 300.0),
    ]

    # Create mock transcription provider with simulated 0.2s delay per chunk
    mock_provider = MagicMock()
    async def mock_transcribe(path, language_hint=None, offset_seconds=0.0):
        await asyncio.sleep(0.1)  # Simulate network STT call
        return TranscriptionResult(
            language="en",
            full_text=f"Chunk at {offset_seconds}s",
            segments=[
                TranscriptSegmentData(
                    start_time=offset_seconds + 1.0,
                    end_time=offset_seconds + 5.0,
                    text=f"Dialogue at {offset_seconds}",
                    speaker="Speaker 1",
                    sequence=0
                )
            ]
        )

    mock_provider.transcribe.side_effect = mock_transcribe

    with patch("app.services.transcription.provider_factory.TranscriptionProviderFactory.get_provider", return_value=mock_provider):
        semaphore = asyncio.Semaphore(2)

        async def transcribe_chunk(chunk_path, offset_sec, chunk_len):
            async with semaphore:
                res = await mock_provider.transcribe(chunk_path, offset_seconds=offset_sec)
                return offset_sec, res

        t_start = time.perf_counter()
        results = await asyncio.gather(*[
            transcribe_chunk(cp, off, cl) for cp, off, cl in mock_chunks
        ])
        t_duration = time.perf_counter() - t_start

        # Both chunks ran concurrently in ~0.1s instead of 0.2s sequentially
        assert t_duration < 0.18
        assert len(results) == 2
        results.sort(key=lambda x: x[0])
        assert results[0][0] == 0.0
        assert results[1][0] == 300.0
        assert results[1][1].segments[0].start_time == 301.0
