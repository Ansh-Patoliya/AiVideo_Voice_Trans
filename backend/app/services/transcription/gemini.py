import os
import re
import json
import asyncio
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from app.core.config import settings
from app.services.transcription.base import (
    TranscriptionProvider,
    TranscriptionResult,
    TranscriptSegmentData,
)

logger = logging.getLogger(__name__)

# Precision verbatim speech and song lyric transcription prompt
SYSTEM_PROMPT = """
You are a world-class audio transcription and lyric-synchronization engine.
Your task is to transcribe EVERY SINGLE SPOKEN OR SUNG WORD in the provided audio file with precise millisecond-level time alignment.

CRITICAL TIME-SYNCHRONIZATION & ACCURACY RULES:
1. Exact Vocal Onset Alignment (CRITICAL FOR SYNC):
   - Set segment `start_time` to the EXACT millisecond the vocalist begins singing or speaking.
   - NEVER start timestamps early during instrumental intros, beat buildups, or background music. If the voice starts at 00:14.20, `start_time` MUST be 14.20.
2. Musical Intros, Solos & Instrumental Gaps:
   - During guitar solos, drum breaks, interludes, or musical pauses where no human voice is present, DO NOT generate segments.
   - Resume timestamps with the exact `start_time` when the vocals resume.
3. Phrase-by-Phrase Granularity (1 Line = 1 Segment):
   - Break segments naturally by lyrical line or speech phrase (typically 2 to 5 seconds per segment).
   - Do NOT merge multiple separate lyrical verses into long giant chunks.
4. Sustained Vocals & Long Notes:
   - For stretched or sustained singing notes (e.g., "Changes...", "Yeah..."), set `end_time` to when the vocal note actually concludes.
5. Complete Unbroken Coverage:
   - NEVER omit or skip any verse, chorus, hook, backing vocal, or repeated line. If a chorus repeats 5 times, output 5 distinct timestamped segments.
6. Verbatim Accuracy:
   - Transcribe exact spoken or sung words. Do not summarize, clean up, paraphrase, or alter lyrics.
7. Australian & Regional English Nuances:
   - Accurately preserve colloquialisms, regional accents, Australian spelling and terms (e.g. "g'day", "arvo", "brekkie", "fair dinkum", "Melbourne") when spoken.
8. Output Format:
   - Return strictly a valid JSON object matching this schema without markdown or commentary outside the JSON:

{
  "language": "en",
  "segments": [
    {
      "start_time": 14.20,
      "end_time": 18.50,
      "text": "Exact line of speech or lyrics.",
      "speaker": null
    }
  ]
}
"""


class GeminiTranscriptionProvider(TranscriptionProvider):
    """Google Gemini implementation for speech-to-text transcription using gemini-3.5-transcribe."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.model_name = (
            settings.GEMINI_TRANSCRIPTION_MODEL
            or settings.GEMINI_MODEL
            or "gemini-3.5-transcribe"
        )
        self._init_client()

    def _init_client(self):
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. Gemini transcription will require an API key.")

    def _normalize_speaker_label(self, raw_speaker: Optional[Any]) -> Optional[str]:
        """Normalizes speaker identifiers into clean 'Speaker N' format or None."""
        if not raw_speaker or str(raw_speaker).strip().lower() in ("null", "none", ""):
            return None
        s = str(raw_speaker).strip()
        m = re.match(r"(?:spk|speaker)[_\s-]*([0-9]+)", s, re.IGNORECASE)
        if m:
            num = int(m.group(1))
            if "spk" in s.lower() and num == 0:
                num = 1
            return f"Speaker {num}"
        return s

    def _parse_timestamp_to_seconds(self, val: Any) -> float:
        """Parses float seconds or 'MM:SS' / 'HH:MM:SS' timecode strings into accurate float seconds."""
        if val is None:
            return 0.0
        if isinstance(val, (int, float)):
            return float(val)
        s = str(val).strip()
        if ":" in s:
            parts = s.split(":")
            try:
                if len(parts) == 2:
                    return float(parts[0]) * 60 + float(parts[1])
                elif len(parts) == 3:
                    return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            except Exception:
                pass
        try:
            return float(s)
        except Exception:
            return 0.0

    async def transcribe(
        self,
        audio_path: str,
        language_hint: Optional[str] = None,
        offset_seconds: float = 0.0
    ) -> TranscriptionResult:
        """Transcribe an audio file using Gemini Speech-to-Text API."""
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is missing. Please set GEMINI_API_KEY in backend/.env to transcribe.")

        audio_file = Path(audio_path).resolve()
        if not audio_file.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Extract audio chunk duration
        from app.services.media.processor import MediaProcessor
        meta = MediaProcessor().get_media_metadata(str(audio_file))
        audio_duration = float(meta.get("duration") or 0.0)

        logger.info(
            f"Transcription started | Provider: Gemini | Model: {self.model_name} | "
            f"Audio: {audio_file.name} (Duration: {audio_duration:.1f}s) | Offset: {offset_seconds:.2f}s"
        )

        prompt = SYSTEM_PROMPT
        if audio_duration > 0:
            prompt += (
                f"\nCRITICAL DURATION & TIMING CONSTRAINT: Total audio duration is EXACTLY {audio_duration:.2f} seconds. "
                f"All start_time and end_time values MUST strictly be in seconds from 0.00 to {audio_duration:.2f} seconds. "
                f"Under NO circumstances should any timestamp exceed {audio_duration:.2f}."
            )
        if language_hint:
            prompt += f"\nPrimary expected language hint: {language_hint}"

        # Attempt transcription with retries
        max_retries = 3
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                raw_response = await self._call_gemini_api(str(audio_file), prompt)
                parsed = self._parse_json_response(raw_response)
                
                detected_lang = str(parsed.get("language") or "en")
                raw_segments = parsed.get("segments", [])
                
                # Check for timestamp drift
                parsed_raw_starts = [self._parse_timestamp_to_seconds(seg.get("start_time", 0.0)) for seg in raw_segments]
                parsed_raw_ends = [self._parse_timestamp_to_seconds(seg.get("end_time", 0.0)) for seg in raw_segments]
                
                max_observed = max(parsed_raw_ends or [0.0])
                scale_factor = 1.0
                if audio_duration > 5.0 and max_observed > (audio_duration * 1.15):
                    # Proportional scale correction if model drifted past actual audio duration
                    scale_factor = audio_duration / max_observed
                    logger.info(f"Correcting timestamp drift: scaling factor {scale_factor:.3f} (max {max_observed:.1f}s -> {audio_duration:.1f}s)")

                processed_segments: List[TranscriptSegmentData] = []
                full_text_parts = []

                for idx, seg in enumerate(raw_segments):
                    raw_start = self._parse_timestamp_to_seconds(seg.get("start_time", 0.0)) * scale_factor
                    raw_end = self._parse_timestamp_to_seconds(seg.get("end_time", raw_start + 2.0)) * scale_factor
                    
                    if audio_duration > 0:
                        raw_start = min(raw_start, audio_duration)
                        raw_end = min(max(raw_end, raw_start + 0.5), audio_duration)

                    # Apply chunk offset correction
                    start = raw_start + offset_seconds
                    end = raw_end + offset_seconds
                    text = str(seg.get("text", "")).strip()
                    speaker = self._normalize_speaker_label(seg.get("speaker"))

                    if not text:
                        continue

                    processed_segments.append(
                        TranscriptSegmentData(
                            start_time=round(start, 2),
                            end_time=round(end, 2),
                            text=text,
                            speaker=speaker,
                            sequence=idx
                        )
                    )
                    full_text_parts.append(text)

                full_text = " ".join(full_text_parts)

                logger.info(
                    f"Transcription completed | Model: {self.model_name} | "
                    f"Segments: {len(processed_segments)} | Language: {detected_lang}"
                )

                return TranscriptionResult(
                    language=detected_lang,
                    full_text=full_text,
                    segments=processed_segments
                )

            except Exception as e:
                last_error = e
                logger.warning(f"Gemini transcription attempt {attempt} failed: {e}")
                if attempt < max_retries:
                    await asyncio.sleep(2 ** attempt)

        raise RuntimeError(f"Gemini transcription failed after {max_retries} attempts: {last_error}")

    async def _call_gemini_api(self, audio_path: str, prompt: str) -> str:
        """Uploads audio file to Gemini File API and generates transcription."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_gemini_call, audio_path, prompt)

    def _sync_gemini_call(self, audio_path: str, prompt: str) -> str:
        """Synchronous helper for Google GenAI / GenerativeAI SDK."""
        safe_path = Path(audio_path).resolve()
        if not safe_path.exists():
            raise FileNotFoundError(f"Audio file not found: {safe_path}")

        try:
            # First try google.genai SDK
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)
            
            # Upload file using resolved Path object
            uploaded_file = client.files.upload(file=str(safe_path))
            mime_type = "audio/wav" if safe_path.suffix.lower() == ".wav" else "audio/mp3"

            candidate_models = [
                self.model_name,
                "gemini-3.5-flash",
                "gemini-3.6-flash",
                "gemini-3.7-flash",
                "gemini-2.5-flash",
            ]
            # Deduplicate while preserving order
            candidate_models = list(dict.fromkeys(candidate_models))

            last_model_err = None
            for model_cand in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_cand,
                        contents=[uploaded_file, prompt],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.0,
                            max_output_tokens=16384,
                        )
                    )
                    # Cleanup uploaded remote file
                    try:
                        client.files.delete(name=uploaded_file.name)
                    except Exception:
                        pass
                    if response.text:
                        return response.text
                except Exception as m_err:
                    last_model_err = m_err
                    logger.warning(f"Transcription model {model_cand} call warning: {m_err}. Trying fallback...")

            # Cleanup uploaded remote file on error
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception:
                pass

            raise last_model_err or RuntimeError("Gemini model transcription call failed.")

        except ImportError:
            # Fallback to google.generativeai SDK
            import google.generativeai as genai

            genai.configure(api_key=self.api_key)
            
            ext = safe_path.suffix.lower()
            mime_type = "audio/wav" if ext == ".wav" else "audio/mp3"

            uploaded_file = genai.upload_file(path=str(safe_path), mime_type=mime_type)
            
            import time
            while uploaded_file.state.name == "PROCESSING":
                time.sleep(1)
                uploaded_file = genai.get_file(uploaded_file.name)

            candidate_models = [
                self.model_name,
                "gemini-3.5-flash",
                "gemini-3.6-flash",
                "gemini-3.7-flash",
                "gemini-2.5-flash",
            ]
            candidate_models = list(dict.fromkeys(candidate_models))

            last_model_err = None
            for model_cand in candidate_models:
                try:
                    model = genai.GenerativeModel(
                        model_name=model_cand,
                        generation_config={"response_mime_type": "application/json", "temperature": 0.1}
                    )
                    response = model.generate_content([uploaded_file, prompt])
                    try:
                        genai.delete_file(uploaded_file.name)
                    except Exception:
                        pass
                    if response.text:
                        return response.text
                except Exception as m_err:
                    last_model_err = m_err
                    logger.warning(f"Transcription model {model_cand} fallback failed: {m_err}")

            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass

            raise last_model_err or RuntimeError("Gemini model transcription call failed.")

    def _parse_json_response(self, raw_text: str) -> Dict[str, Any]:
        """Safely parses JSON from LLM response text with robust 4-stage repair for truncated responses."""
        cleaned = raw_text.strip()
        # Remove markdown code fences if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()

        # Stage 1: Direct parse
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Stage 2: Clean trailing commas
        try:
            fixed = re.sub(r",\s*([\]}])", r"\1", cleaned)
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass

        # Stage 3: Regex object extraction
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        # Stage 4: Segment-level extraction fallback (in case JSON was truncated near the end)
        segment_pattern = re.compile(
            r'\{\s*"start_time"\s*:\s*([0-9.]+)\s*,\s*"end_time"\s*:\s*([0-9.]+)\s*,\s*"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"(?:\s*,\s*"speaker"\s*:\s*([^,}]+))?\s*\}'
        )
        extracted_segments = []
        for m in segment_pattern.finditer(cleaned):
            try:
                start_t = float(m.group(1))
                end_t = float(m.group(2))
                txt = m.group(3).encode('utf-8').decode('unicode_escape', 'ignore')
                spk = m.group(4).strip().strip('"') if m.group(4) and m.group(4).strip() != 'null' else None
                extracted_segments.append({
                    "start_time": start_t,
                    "end_time": end_t,
                    "text": txt,
                    "speaker": spk
                })
            except Exception:
                continue

        if extracted_segments:
            logger.info(f"Recovered {len(extracted_segments)} segments using fallback regex parser.")
            return {
                "language": "en",
                "segments": extracted_segments
            }

        raise ValueError(f"Unable to parse valid JSON from transcription response: {raw_text[:200]}...")

    async def detect_language(self, audio_path: str) -> str:
        """Quick language detection sample."""
        res = await self.transcribe(audio_path)
        return res.language
