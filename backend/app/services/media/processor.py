import os
import shutil
import subprocess
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)


class MediaProcessor:
    """Handles audio extraction, format conversion, metadata extraction, and audio chunking using FFmpeg."""

    def __init__(self):
        self.ffmpeg_exe = self._resolve_ffmpeg()
        self.ffprobe_exe = self._resolve_ffprobe()

    def _resolve_ffmpeg(self) -> str:
        """Locate FFmpeg executable from settings, PATH, or imageio-ffmpeg bundle."""
        if settings.FFMPEG_PATH and os.path.exists(settings.FFMPEG_PATH):
            return settings.FFMPEG_PATH
        
        system_ffmpeg = shutil.which("ffmpeg")
        if system_ffmpeg:
            return system_ffmpeg
        
        try:
            import imageio_ffmpeg
            exe = imageio_ffmpeg.get_ffmpeg_exe()
            if exe and os.path.exists(exe):
                return exe
        except Exception as e:
            logger.warning(f"Could not load imageio_ffmpeg: {e}")
        
        return "ffmpeg"

    def _resolve_ffprobe(self) -> Optional[str]:
        """Locate ffprobe executable if available."""
        if settings.FFPROBE_PATH and os.path.exists(settings.FFPROBE_PATH):
            return settings.FFPROBE_PATH
        return shutil.which("ffprobe")

    def get_media_metadata(self, file_path: str) -> Dict[str, Any]:
        """Inspect media file to extract duration, dimensions, bitrates, audio/video streams."""
        duration = 0.0
        has_audio = False
        has_video = False
        format_name = ""

        # Try ffprobe if available
        if self.ffprobe_exe:
            try:
                cmd = [
                    self.ffprobe_exe,
                    "-v", "quiet",
                    "-print_format", "json",
                    "-show_format",
                    "-show_streams",
                    file_path
                ]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
                data = json.loads(res.stdout)
                
                if "format" in data:
                    duration = float(data["format"].get("duration", 0.0))
                    format_name = data["format"].get("format_name", "")
                
                for stream in data.get("streams", []):
                    codec_type = stream.get("codec_type")
                    if codec_type == "video":
                        has_video = True
                    elif codec_type == "audio":
                        has_audio = True

                return {
                    "duration": duration,
                    "has_audio": has_audio,
                    "has_video": has_video,
                    "format_name": format_name,
                }
            except Exception as e:
                logger.warning(f"ffprobe failed on {file_path}: {e}. Falling back to ffmpeg probe.")

        # Fallback to ffmpeg -i info inspection
        try:
            cmd = [self.ffmpeg_exe, "-i", file_path]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            output = res.stderr

            # Extract Duration: 00:01:23.45
            import re
            dur_match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", output)
            if dur_match:
                hours = float(dur_match.group(1))
                minutes = float(dur_match.group(2))
                seconds = float(dur_match.group(3))
                duration = hours * 3600 + minutes * 60 + seconds

            has_video = "Video:" in output
            has_audio = "Audio:" in output

            return {
                "duration": duration,
                "has_audio": has_audio,
                "has_video": has_video,
                "format_name": Path(file_path).suffix.lstrip("."),
            }
        except Exception as e:
            logger.error(f"Failed to inspect media file {file_path}: {e}")
            return {
                "duration": duration,
                "has_audio": True,
                "has_video": True,
                "format_name": Path(file_path).suffix.lstrip("."),
            }

    def extract_audio(self, input_media_path: str, output_audio_path: Optional[str] = None) -> str:
        """
        Extracts speech-optimized audio from video/audio file:
        - 16,000 Hz sample rate (optimal for speech models)
        - 1 channel (mono)
        - 16-bit PCM WAV or high-quality MP3
        """
        input_path = Path(input_media_path)
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_media_path}")

        if not output_audio_path:
            output_audio_path = str(Path(settings.TEMP_DIR_PATH) / f"{input_path.stem}_audio.mp3")

        # Speech-optimized 16kHz mono MP3 (96kbps) with dynamic vocal booster and exact PTS lock
        cmd = [
            self.ffmpeg_exe,
            "-y",
            "-i", str(input_path),
            "-vn",
            "-ar", "16000",
            "-ac", "1",
            "-avoid_negative_ts", "make_zero",
            "-af", "dynaudnorm=p=0.95:m=10:s=12",
            "-b:a", "96k",
            output_audio_path
        ]

        logger.info(f"Extracting speech-optimized audio: {' '.join(cmd)}")
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        if result.returncode != 0:
            logger.warning(f"Optimized MP3 extraction failed: {result.stderr}. Falling back to 16kHz PCM WAV...")
            output_audio_path = str(Path(settings.TEMP_DIR_PATH) / f"{input_path.stem}_audio.wav")
            standard_cmd = [
                self.ffmpeg_exe,
                "-y",
                "-i", str(input_path),
                "-vn",
                "-ar", "16000",
                "-ac", "1",
                "-avoid_negative_ts", "make_zero",
                "-c:a", "pcm_s16le",
                output_audio_path
            ]
            fallback_res = subprocess.run(standard_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if fallback_res.returncode != 0:
                raise RuntimeError(f"FFmpeg audio extraction failed: {fallback_res.stderr}")

        return output_audio_path

    def chunk_audio(
        self,
        audio_file_path: str,
        chunk_duration: Optional[int] = None,
        overlap: Optional[int] = None
    ) -> List[Tuple[str, float, float]]:
        """
        Splits a long audio file into sequential chunks for transcription.
        Returns a list of tuples: (chunk_file_path, start_time_offset, chunk_duration)
        """
        chunk_dur = chunk_duration or settings.AUDIO_CHUNK_DURATION_SECONDS
        chunk_overlap = overlap if overlap is not None else settings.AUDIO_CHUNK_OVERLAP_SECONDS

        meta = self.get_media_metadata(audio_file_path)
        total_duration = meta["duration"]

        if total_duration <= chunk_dur:
            # Single chunk is sufficient
            return [(audio_file_path, 0.0, total_duration)]

        chunks = []
        start_time = 0.0
        chunk_idx = 0
        input_path = Path(audio_file_path)

        while start_time < total_duration:
            current_duration = min(chunk_dur, total_duration - start_time)
            chunk_output = str(Path(settings.TEMP_DIR_PATH) / f"{input_path.stem}_chunk_{chunk_idx}.wav")

            cmd = [
                self.ffmpeg_exe,
                "-y",
                "-ss", str(start_time),
                "-i", str(input_path),
                "-t", str(current_duration),
                "-c", "copy",
                chunk_output
            ]

            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode != 0:
                # Retry with re-encoding
                cmd_reencode = [
                    self.ffmpeg_exe,
                    "-y",
                    "-ss", str(start_time),
                    "-i", str(input_path),
                    "-t", str(current_duration),
                    "-ar", "16000",
                    "-ac", "1",
                    "-c:a", "pcm_s16le",
                    chunk_output
                ]
                res_reencode = subprocess.run(cmd_reencode, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                if res_reencode.returncode != 0:
                    logger.error(f"Failed to create chunk {chunk_idx}: {res_reencode.stderr}")
                    break

            chunks.append((chunk_output, start_time, current_duration))
            start_time += (chunk_dur - chunk_overlap)
            chunk_idx += 1

        return chunks

    def cleanup_files(self, file_paths: List[str]):
        """Safely remove temporary processing files."""
        for fp in file_paths:
            try:
                if fp and os.path.exists(fp):
                    # Do not delete files in permanent media storage
                    if str(settings.LOCAL_STORAGE_DIR) not in os.path.abspath(fp):
                        os.remove(fp)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file {fp}: {e}")
