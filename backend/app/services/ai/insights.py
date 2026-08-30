import os
import re
import json
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class AIInsightsService:
    """Provides LLM-powered summarization, key points, keywords, and timestamped section highlights."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.model_name = settings.GEMINI_ANALYSIS_MODEL or "gemini-2.5-flash"

    def _format_time(self, seconds: float) -> str:
        mins = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{mins:02d}:{secs:02d}"

    async def generate_all_insights(
        self,
        transcript_text: str,
        segments_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generates comprehensive insights: summary, key points, keywords, and important sections."""
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        # Build timestamped transcript excerpt for prompt context
        lines = []
        for s in segments_data[:200]:  # Up to 200 segments for prompt budget
            time_str = self._format_time(s.get("start_time", 0.0))
            lines.append(f"[{time_str}] (t={s.get('start_time', 0.0):.2f}s): {s.get('text', '')}")
        
        context_text = "\n".join(lines)

        prompt = f"""
You are an expert video and audio content analyst. Analyze the following timestamped transcript.

TRANSCRIPT:
{context_text}

Provide the following 4 structured insights in JSON format:
1. "summary": A concise, engaging 2-4 sentence executive summary.
2. "key_points": A list of 4 to 8 key takeaways / bullet points.
3. "keywords": A list of 6 to 12 relevant topical keywords / tags.
4. "important_sections": A list of 3 to 6 key moments. Each item MUST have:
   - "timestamp": The exact float timestamp in seconds from the transcript (e.g. 14.5). MUST match an actual timestamp in the transcript above.
   - "formatted_time": Formatted timecode (e.g. "00:14").
   - "title": Short title (e.g. "Pricing Breakdown", "Key Announcement").
   - "reason": 1-sentence explanation of why this moment is important.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this schema:
{{
  "summary": "...",
  "key_points": ["Point 1", "Point 2"],
  "keywords": ["tag1", "tag2"],
  "important_sections": [
    {{
      "timestamp": 12.4,
      "formatted_time": "00:12",
      "title": "...",
      "reason": "..."
    }}
  ]
}}
"""

        raw_response = await self._call_gemini_text(prompt)
        return self._parse_json(raw_response)

    async def _call_gemini_text(self, prompt: str) -> str:
        """Calls Gemini with text prompt."""
        candidate_models = [
            self.model_name,
            "gemini-3.5-flash",
            "gemini-3.6-flash",
            "gemini-3.7-flash",
            "gemini-2.5-flash",
        ]
        candidate_models = list(dict.fromkeys(candidate_models))

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)
            last_err = None
            for model_cand in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_cand,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2,
                        )
                    )
                    return response.text
                except Exception as m_err:
                    last_err = m_err
                    logger.warning(f"Insights model {model_cand} failed: {m_err}. Trying fallback...")
            raise last_err or RuntimeError("Gemini content generation failed.")

        except ImportError:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            last_err = None
            for model_cand in candidate_models:
                try:
                    model = genai.GenerativeModel(
                        model_name=model_cand,
                        generation_config={"response_mime_type": "application/json", "temperature": 0.2}
                    )
                    response = model.generate_content(prompt)
                    return response.text
                except Exception as m_err:
                    last_err = m_err
            raise last_err or RuntimeError("Gemini content generation failed.")

    def _parse_json(self, raw_text: str) -> Dict[str, Any]:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except Exception:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return {
                "summary": "Summary generation completed.",
                "key_points": [],
                "keywords": [],
                "important_sections": []
            }
