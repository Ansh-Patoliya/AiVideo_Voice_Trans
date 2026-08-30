import os
import time
import asyncio
import logging
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Tuple

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.media import Media, MediaStatus
from app.models.transcript import Transcript, TranscriptSegment
from app.services.media.processor import MediaProcessor
from app.services.media.downloader import MediaDownloader
from app.services.storage.cloudinary_service import StorageService
from app.services.transcription.provider_factory import TranscriptionProviderFactory
from app.services.transcription.base import TranscriptSegmentData, TranscriptionResult

logger = logging.getLogger(__name__)


class ProcessingPipelineRunner:
    """
    Optimized pipeline runner:
    - Decouples Cloudinary upload to background task so transcription begins immediately.
    - Profiles high-resolution execution times for every stage.
    - Transcribes multi-chunk audio concurrently with controlled concurrency.
    """

    def __init__(self):
        self.processor = MediaProcessor()
        self.storage = StorageService()
        self.downloader = MediaDownloader()

    def _update_media_status(
        self,
        db,
        media_id: int,
        status: MediaStatus,
        error_message: Optional[str] = None,
        duration: Optional[float] = None
    ):
        """Helper to update media state in database."""
        media = db.query(Media).filter(Media.id == media_id).first()
        if media:
            media.status = status.value
            if error_message is not None:
                media.error_message = error_message
            if duration is not None and duration > 0:
                media.duration = duration
            media.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(media)
        return media

    async def _upload_storage_in_background(self, media_id: int, local_file: str, media_type: str):
        """Uploads media file to Cloudinary in the background without blocking transcription."""
        t_start = time.perf_counter()
        try:
            loop = asyncio.get_event_loop()
            storage_res = await loop.run_in_executor(
                None, self.storage.upload_file, local_file, None, media_type
            )
            
            c_url = storage_res.get("url")
            c_id = storage_res.get("public_id")
            c_bytes = storage_res.get("bytes")

            if c_url:
                db = SessionLocal()
                try:
                    media = db.query(Media).filter(Media.id == media_id).first()
                    if media:
                        media.cloudinary_url = c_url
                        media.cloudinary_public_id = c_id
                        if c_bytes:
                            media.file_size = c_bytes
                        db.commit()
                        t_end = time.perf_counter()
                        logger.info(f"[PROFILING] Background Cloudinary upload completed for media {media_id}: {t_end - t_start:.2f}s")
                finally:
                    db.close()
        except Exception as e:
            logger.warning(f"Background Cloudinary upload warning for media {media_id}: {e}")

    async def run_pipeline(self, media_id: int):
        """Orchestrates fast end-to-end background processing."""
        t_pipeline_start = time.perf_counter()
        dl_time = 0.0
        ffmpeg_time = 0.0
        stt_time = 0.0
        db_time = 0.0

        db = SessionLocal()
        temp_files_to_clean = []

        try:
            media = db.query(Media).filter(Media.id == media_id).first()
            if not media:
                logger.error(f"Media with id {media_id} not found.")
                return

            logger.info(f"Starting optimized processing pipeline for media ID {media_id}: {media.title}")
            self._update_media_status(db, media_id, MediaStatus.PROCESSING)

            local_source_file = media.local_media_path

            # Step 1: Handle URL downloads
            if media.source_url and (not local_source_file or not os.path.exists(local_source_file)):
                t_dl_start = time.perf_counter()
                try:
                    download_res = await self.downloader.download(media.source_url)
                    local_source_file = download_res["file_path"]
                    
                    media.title = media.title or download_res.get("title") or "Video Transcription"
                    media.mime_type = download_res.get("mime_type")
                    if download_res.get("duration"):
                        media.duration = download_res["duration"]
                    media.local_media_path = local_source_file
                    db.commit()
                    dl_time = time.perf_counter() - t_dl_start
                    logger.info(f"[PROFILING] URL download finished: {dl_time:.2f}s")
                except Exception as dl_err:
                    err_msg = str(dl_err)
                    logger.error(f"Media download failed for {media.source_url}: {err_msg}")
                    self._update_media_status(db, media_id, MediaStatus.FAILED, error_message=err_msg)
                    return

            if not local_source_file or not os.path.exists(local_source_file):
                self._update_media_status(db, media_id, MediaStatus.FAILED, error_message="Source media file not accessible.")
                return

            # Step 2: Launch Cloudinary Storage Upload in background (Non-blocking)
            if not media.cloudinary_url:
                asyncio.create_task(
                    self._upload_storage_in_background(media_id, local_source_file, media.media_type)
                )

            # Step 3: Extract Speech-Optimized Audio & Inspect Metadata
            t_ffmpeg_start = time.perf_counter()
            self._update_media_status(db, media_id, MediaStatus.EXTRACTING_AUDIO)
            
            meta = self.processor.get_media_metadata(local_source_file)
            media_duration = meta.get("duration", media.duration or 0.0)
            media.duration = media_duration
            if not meta.get("has_video", True):
                media.media_type = "audio"
            db.commit()

            audio_file = self.processor.extract_audio(local_source_file)
            temp_files_to_clean.append(audio_file)
            ffmpeg_time = time.perf_counter() - t_ffmpeg_start
            logger.info(f"[PROFILING] Audio extraction & normalization finished: {ffmpeg_time:.2f}s")

            # Step 4: Chunk Audio if necessary & Transcribe
            self._update_media_status(db, media_id, MediaStatus.TRANSCRIBING, duration=media_duration)
            
            chunks = self.processor.chunk_audio(audio_file)
            for chunk_file, _, _ in chunks:
                if chunk_file != audio_file:
                    temp_files_to_clean.append(chunk_file)

            provider = TranscriptionProviderFactory.get_provider(settings.DEFAULT_TRANSCRIPTION_PROVIDER)

            t_stt_start = time.perf_counter()
            semaphore = asyncio.Semaphore(settings.TRANSCRIPTION_MAX_CONCURRENCY)

            async def transcribe_chunk(chunk_path: str, offset_sec: float, chunk_len: float) -> Tuple[float, TranscriptionResult]:
                async with semaphore:
                    logger.info(f"Transcribing chunk for media {media_id}: offset={offset_sec:.1f}s, duration={chunk_len:.1f}s")
                    res = await provider.transcribe(
                        chunk_path,
                        language_hint=media.language,
                        offset_seconds=offset_sec
                    )
                    return offset_sec, res

            chunk_tasks = [
                transcribe_chunk(chunk_path, offset_sec, chunk_len)
                for chunk_path, offset_sec, chunk_len in chunks
            ]
            
            chunk_results = await asyncio.gather(*chunk_tasks)
            # Sort by offset to ensure strict chronological ordering
            chunk_results.sort(key=lambda x: x[0])

            all_segments: List[TranscriptSegmentData] = []
            detected_language = "en"
            seq_counter = 0

            for _, chunk_result in chunk_results:
                if chunk_result.language:
                    detected_language = chunk_result.language

                for seg in chunk_result.segments:
                    seg.sequence = seq_counter
                    seq_counter += 1
                    all_segments.append(seg)

            stt_time = time.perf_counter() - t_stt_start
            logger.info(f"[PROFILING] STT Transcription finished: {stt_time:.2f}s ({len(all_segments)} segments)")

            # Step 5: Save Transcript to Database
            t_db_start = time.perf_counter()
            self._update_media_status(db, media_id, MediaStatus.SAVING)
            
            full_text = " ".join([s.text for s in all_segments])

            existing_transcript = db.query(Transcript).filter(Transcript.media_id == media_id).first()
            if existing_transcript:
                db.delete(existing_transcript)
                db.commit()

            transcript_record = Transcript(
                media_id=media_id,
                language=detected_language,
                full_text=full_text,
            )
            db.add(transcript_record)
            db.flush()

            for seg in all_segments:
                db_seg = TranscriptSegment(
                    transcript_id=transcript_record.id,
                    start_time=seg.start_time,
                    end_time=seg.end_time,
                    text=seg.text,
                    speaker=seg.speaker,
                    sequence=seg.sequence
                )
                db.add(db_seg)

            media.language = detected_language
            media.status = MediaStatus.COMPLETED.value
            media.error_message = None
            db.commit()
            db_time = time.perf_counter() - t_db_start

            total_pipeline_time = time.perf_counter() - t_pipeline_start
            logger.info(
                f"[PROCESSING PROFILE] Media ID {media_id} ({media.title}): "
                f"Download={dl_time:.2f}s | AudioExtraction={ffmpeg_time:.2f}s | "
                f"STT={stt_time:.2f}s | DB={db_time:.2f}s | "
                f"TotalTimeToTranscript={total_pipeline_time:.2f}s"
            )

        except Exception as e:
            logger.error(f"Error in pipeline for media {media_id}: {e}\n{traceback.format_exc()}")
            self._update_media_status(db, media_id, MediaStatus.FAILED, error_message=str(e))
        finally:
            self.processor.cleanup_files(temp_files_to_clean)
            db.close()


pipeline_runner = ProcessingPipelineRunner()
