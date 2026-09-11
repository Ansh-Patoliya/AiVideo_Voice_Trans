import os
import re
import json
import logging
from typing import Dict, Any, Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)


class AIRephraseService:
    """Service to rephrase a transcript paragraph using Gemini AI."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.model_name = settings.GEMINI_ANALYSIS_MODEL or "gemini-3.5-flash"

    async def rephrase_paragraph(
        self,
        text: str,
        tone: Optional[str] = "professional",
        custom_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        if not text or not text.strip():
            return {
                "rephrased_text": "",
                "token_usage": {
                    "prompt_tokens": 0,
                    "candidates_tokens": 0,
                    "total_tokens": 0,
                    "estimated_cost_usd": 0.0,
                },
            }

        tone_guidance = ""
        tone_lower = (tone or "").strip().lower()
        if tone_lower == "professional":
            tone_guidance = "Tone: Professional, articulate, clear, and business-appropriate. Eliminate slang and verbal clutter while keeping a natural conversational flow."
        elif tone_lower in ["casual", "reels"]:
            tone_guidance = "Tone: Engaging, dynamic, modern, and punchy. Ideal for social media reels/shorts, crisp and relatable."
        elif tone_lower in ["simplified", "simple"]:
            tone_guidance = "Tone: Simple and accessible. Use clear, plain vocabulary that anyone can instantly comprehend."
        elif tone_lower in ["punchy", "concise"]:
            tone_guidance = "Tone: Concise and direct. Remove filler words, tighten sentences without losing any core meaning."
        else:
            tone_guidance = f"Tone style: {tone}"

        custom_prompt_part = ""
        if custom_instruction and custom_instruction.strip():
            custom_prompt_part = f"\nUser's Specific Custom Instruction: \"{custom_instruction.strip()}\""

        prompt = f"""
You are an expert script editor and speech linguist.
Your mission is to rewrite the paragraph below as ONE smooth, cohesive, naturally-flowing paragraph, the way a polished narrator would read it aloud.
{tone_guidance}{custom_prompt_part}

CRITICAL RULES:
1. WHOLE-PARAGRAPH REWRITE: Rephrase the entire paragraph as continuous prose with natural transitions between sentences. Actively improve phrasing and remove speech fillers ('uh', 'um', 'like', 'you know', 'ah'). Do NOT simply copy the original text as-is.
2. STRICT MEANING PRESERVATION: The semantic meaning, facts, and intent MUST remain 100% identical to the original. Do not invent facts, omit key details, or change the subject.
3. LENGTH COMPATIBILITY: The rephrased paragraph must be comparable in overall length to the original so it fits the natural video speech timing.
4. NO MARKDOWN WRAPPERS: Respond strictly with the JSON object described below.

SOURCE PARAGRAPH:
{text.strip()}

OUTPUT FORMAT:
Respond ONLY with a valid JSON object of the form:
{{
  "rephrased_text": "The entire rewritten paragraph here."
}}
"""

        raw_response, usage = await self._call_gemini_text(prompt)
        rephrased = self._parse_response(raw_response)

        if not rephrased:
            rephrased = text.strip()

        total_tokens = usage.get("prompt_tokens", 0) + usage.get("candidates_tokens", 0)
        est_cost = (usage.get("prompt_tokens", 0) * 0.75 + usage.get("candidates_tokens", 0) * 4.50) / 1_000_000.0

        return {
            "rephrased_text": rephrased,
            "token_usage": {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "candidates_tokens": usage.get("candidates_tokens", 0),
                "total_tokens": total_tokens,
                "estimated_cost_usd": round(est_cost, 6),
            },
        }

    async def _call_gemini_text(self, prompt: str) -> Tuple[str, Dict[str, int]]:
        candidate_models = [
            self.model_name,
            "gemini-3.5-flash",
            "gemini-3.6-flash",
            "gemini-2.5-flash",
        ]
        candidate_models = list(dict.fromkeys(candidate_models))

        usage: Dict[str, int] = {"prompt_tokens": 0, "candidates_tokens": 0, "total_tokens": 0}

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
                            temperature=0.3,
                        ),
                    )

                    if hasattr(response, "usage_metadata") and response.usage_metadata:
                        um = response.usage_metadata
                        usage["prompt_tokens"] = getattr(um, "prompt_token_count", 0) or 0
                        usage["candidates_tokens"] = getattr(um, "candidates_token_count", 0) or 0
                        usage["total_tokens"] = getattr(um, "total_token_count", 0) or (
                            usage["prompt_tokens"] + usage["candidates_tokens"]
                        )

                    return response.text, usage
                except Exception as m_err:
                    last_err = m_err
                    logger.warning(f"Rephrase model {model_cand} failed: {m_err}. Trying next...")
            raise last_err or RuntimeError("Gemini content generation failed.")

        except ImportError:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            last_err = None
            for model_cand in candidate_models:
                try:
                    model = genai.GenerativeModel(
                        model_name=model_cand,
                        generation_config={"response_mime_type": "application/json", "temperature": 0.3},
                    )
                    response = model.generate_content(prompt)

                    if hasattr(response, "usage_metadata") and response.usage_metadata:
                        um = response.usage_metadata
                        usage["prompt_tokens"] = getattr(um, "prompt_token_count", 0) or 0
                        usage["candidates_tokens"] = getattr(um, "candidates_token_count", 0) or 0
                        usage["total_tokens"] = getattr(um, "total_token_count", 0) or (
                            usage["prompt_tokens"] + usage["candidates_tokens"]
                        )

                    return response.text, usage
                except Exception as m_err:
                    last_err = m_err
            raise last_err or RuntimeError("Gemini content generation failed.")

    def _parse_response(self, raw_text: str) -> str:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            res = json.loads(cleaned)
            if isinstance(res, dict):
                return str(res.get("rephrased_text") or "").strip()
        except Exception:
            pass

        match = re.search(r'"rephrased_text"\s*:\s*"(.*?)"\s*\}', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(f'"{match.group(1)}"')
            except Exception:
                return match.group(1)

        return ""
