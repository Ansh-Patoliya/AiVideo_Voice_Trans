import os
import re
import json
import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)


class AIRephraseService:
    """Service to paraphrase and rephrase dialogue transcripts while strictly preserving original meaning."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.model_name = settings.GEMINI_ANALYSIS_MODEL or "gemini-3.5-flash"

    async def rephrase_segments(
        self,
        segments_data: List[Dict[str, Any]],
        tone: Optional[str] = "professional",
        custom_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Rephrases a list of segments in safe batches of up to 35 items.
        Returns:
        {
            "items": [{"segment_id": int, "original_text": str, "rephrased_text": str}],
            "token_usage": {
                "prompt_tokens": int,
                "candidates_tokens": int,
                "total_tokens": int,
                "estimated_cost_usd": float
            }
        }
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        if not segments_data:
            return {
                "items": [],
                "token_usage": {
                    "prompt_tokens": 0,
                    "candidates_tokens": 0,
                    "total_tokens": 0,
                    "estimated_cost_usd": 0.0,
                },
            }

        # Divide segments into batches of up to 35 to guarantee Gemini output fits within token limits
        BATCH_SIZE = 35
        batches = [
            segments_data[i : i + BATCH_SIZE]
            for i in range(0, len(segments_data), BATCH_SIZE)
        ]

        sem = asyncio.Semaphore(3)  # Run up to 3 batches concurrently

        async def process_single_batch(batch_items: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
            async with sem:
                return await self._process_batch(batch_items, tone, custom_instruction)

        batch_results = await asyncio.gather(*(process_single_batch(b) for b in batches))

        all_items: List[Dict[str, Any]] = []
        total_prompt_tokens = 0
        total_candidates_tokens = 0
        total_tokens = 0

        for items, usage in batch_results:
            all_items.extend(items)
            total_prompt_tokens += usage.get("prompt_tokens", 0)
            total_candidates_tokens += usage.get("candidates_tokens", 0)

        # Total tokens is strictly the sum of prompt + completion tokens
        total_tokens = total_prompt_tokens + total_candidates_tokens

        # Gemini 3.5 Flash pricing ($0.75 / 1M prompt tokens, $4.50 / 1M output tokens)
        est_cost = (total_prompt_tokens * 0.75 + total_candidates_tokens * 4.50) / 1_000_000.0

        return {
            "items": all_items,
            "token_usage": {
                "prompt_tokens": total_prompt_tokens,
                "candidates_tokens": total_candidates_tokens,
                "total_tokens": total_tokens,
                "estimated_cost_usd": round(est_cost, 6),
            },
        }

    async def _process_batch(
        self,
        batch_items: List[Dict[str, Any]],
        tone: Optional[str],
        custom_instruction: Optional[str],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
        # Build tone instruction prompt
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

        input_payload = [
            {
                "segment_id": s["id"],
                "text": s.get("text", "").strip(),
            }
            for s in batch_items
        ]

        prompt = f"""
You are an expert script editor and speech linguist.
Your mission is to rephrase and improve the given spoken transcript dialogue segments.
{tone_guidance}{custom_prompt_part}

CRITICAL RULES:
1. ACTIVELY REWORD & REPHRASE: You MUST actively improve the phrasing, remove speech fillers ('uh', 'um', 'like', 'you know', 'ah'), and rewrite each sentence. Do NOT simply copy the original sentence as-is.
2. STRICT MEANING PRESERVATION: The semantic meaning, facts, and intent MUST remain 100% identical to the original line. Do not invent facts, omit key details, or change the subject.
3. TIMING & LENGTH COMPATIBILITY: The rephrased version must be comparable in syllable count/length to the original so it fits the natural video speech timing.
4. 1-TO-1 MAPPING: You MUST return exactly one rephrased entry for every input segment_id in the exact same order.
5. NO MARKDOWN WRAPPERS: Respond strictly with a JSON array.

INPUT SEGMENTS:
{json.dumps(input_payload, ensure_ascii=False, indent=2)}

OUTPUT FORMAT:
Respond ONLY with a valid JSON array of objects with keys "segment_id" (integer), "original_text" (string), and "rephrased_text" (string):
[
  {{
    "segment_id": 1,
    "original_text": "...",
    "rephrased_text": "..."
  }}
]
"""

        raw_response, usage = await self._call_gemini_text(prompt)
        parsed = self._parse_json_array(raw_response)

        results = []
        parsed_dict = {
            item.get("segment_id"): item.get("rephrased_text")
            for item in parsed
            if isinstance(item, dict)
        }

        for s in batch_items:
            sid = s["id"]
            orig_text = s.get("text", "")
            rephrased = parsed_dict.get(sid) or orig_text
            results.append({
                "segment_id": sid,
                "original_text": orig_text,
                "rephrased_text": rephrased,
            })

        return results, usage

    async def _call_gemini_text(self, prompt: str) -> Tuple[str, Dict[str, int]]:
        candidate_models = [
            self.model_name,
            "gemini-3.5-flash",
            "gemini-3.6-flash",
            "gemini-2.5-flash",
        ]
        candidate_models = list(dict.fromkeys(candidate_models))

        usage = {"prompt_tokens": 0, "candidates_tokens": 0, "total_tokens": 0}

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

                    # Extract usage metadata
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

    def _parse_json_array(self, raw_text: str) -> List[Dict[str, Any]]:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            res = json.loads(cleaned)
            if isinstance(res, list):
                return res
            if isinstance(res, dict) and "items" in res and isinstance(res["items"], list):
                return res["items"]
            if isinstance(res, dict) and "rephrased_segments" in res and isinstance(res["rephrased_segments"], list):
                return res["rephrased_segments"]
            return []
        except Exception:
            match = re.search(r"\[.*\]", cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    pass
            return []
