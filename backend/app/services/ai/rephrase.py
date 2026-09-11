import os
import re
import json
import logging
from typing import Dict, Any, Optional, Tuple, List
from app.core.config import settings

logger = logging.getLogger(__name__)


class AIRephraseService:
    """Service to rephrase a transcript paragraph and autonomously learn creator persona/tone memory using Gemini AI."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.model_name = settings.GEMINI_ANALYSIS_MODEL or "gemini-3.5-flash"

    async def extract_and_evolve_memory(
        self,
        new_instruction: str,
        current_persona: Optional[str] = None,
        current_traits: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        ChatGPT-style autonomous memory extractor.
        Analyzes the user's custom instruction to extract persistent creator tone/style rules.
        """
        if not self.api_key or not new_instruction or not new_instruction.strip():
            return {
                "has_style_preferences": False,
                "persona_title": current_persona or "Custom Creator Voice",
                "traits": current_traits or [],
                "learned_summary": None,
            }

        existing_traits_json = json.dumps(current_traits or [], ensure_ascii=False)
        curr_persona = current_persona or "Custom Creator Voice"

        prompt = f"""
You are an autonomous Creator Voice & Tone Memory Engine (similar to ChatGPT Memory).
Your job is to analyze a creator's instruction/prompt and extract persistent writing style, tone, pacing, and vocabulary preferences.

CURRENT CREATOR MEMORY:
- Persona Title: "{curr_persona}"
- Current Traits: {existing_traits_json}

NEW USER INSTRUCTION:
"{new_instruction.strip()}"

TASK:
1. Determine if the new user instruction contains tone, style, pacing, vocabulary, audience, or language habits (e.g. "energetic", "short punchy sentences", "conversational reels vibe", "no jargon", "Gujlish/Hinglish slang", "authoritative & professional").
2. If YES:
   - Synthesize or refine a short, descriptive "persona_title" (2-5 words, e.g. "Energetic Tech Reel Creator", "Conversational Storyteller", "Crisp Business Narrator").
   - Extract 3 to 6 concise, distinct bullet points ("traits") summarizing their persistent writing habits. Merge them smoothly with previous traits, eliminating duplicates or obsolete contradictions.
   - Provide a short 1-line "learned_summary" describing what was just learned (e.g. "Learned: punchy sentences & energetic social reel tone").
3. If the instruction is merely a one-off request with no style relevance (e.g., "translate to Hindi" or "delete the last word"):
   - Set "has_style_preferences": false and keep previous traits.

OUTPUT FORMAT (JSON ONLY):
{{
  "has_style_preferences": true,
  "persona_title": "string",
  "traits": [
    "Tone rule 1",
    "Tone rule 2"
  ],
  "learned_summary": "Short 1-line summary"
}}
"""

        try:
            raw_response, _ = await self._call_gemini_text(prompt)
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                cleaned = re.sub(r"\n?```$", "", cleaned)
                cleaned = cleaned.strip()

            data = json.loads(cleaned)
            if isinstance(data, dict) and data.get("has_style_preferences"):
                traits = [t.strip() for t in data.get("traits", []) if isinstance(t, str) and t.strip()]
                return {
                    "has_style_preferences": True,
                    "persona_title": data.get("persona_title") or curr_persona,
                    "traits": traits[:6],
                    "learned_summary": data.get("learned_summary") or "Updated creator tone memory",
                }
        except Exception as e:
            logger.warning(f"Failed to evolve memory from prompt: {e}")

        return {
            "has_style_preferences": False,
            "persona_title": curr_persona,
            "traits": current_traits or [],
            "learned_summary": None,
        }

    async def rephrase_paragraph(
        self,
        text: str,
        tone: Optional[str] = "professional",
        custom_instruction: Optional[str] = None,
        memory_persona: Optional[str] = None,
        memory_traits: Optional[List[str]] = None,
        use_memory: bool = True,
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
            tone_guidance = "Base Tone: Professional, articulate, clear, and business-appropriate. Eliminate verbal clutter while keeping a natural flow."
        elif tone_lower in ["casual", "reels"]:
            tone_guidance = "Base Tone: Engaging, dynamic, modern, and punchy. Ideal for social media reels/shorts, crisp and relatable."
        elif tone_lower in ["simplified", "simple"]:
            tone_guidance = "Base Tone: Simple and accessible. Use clear, plain vocabulary that anyone can instantly comprehend."
        elif tone_lower in ["punchy", "concise"]:
            tone_guidance = "Base Tone: Concise and direct. Remove filler words, tighten sentences without losing any core meaning."
        elif tone:
            tone_guidance = f"Base Tone style: {tone}"

        # Creator Memory Injection
        memory_prompt_part = ""
        if use_memory and memory_traits and len(memory_traits) > 0:
            traits_formatted = "\n".join([f"- {t}" for t in memory_traits])
            persona_name = memory_persona or "Custom Creator Voice"
            memory_prompt_part = f"""
[ACTIVE CREATOR MEMORY & PERSONALITY PROFILE]:
Persona Profile: "{persona_name}"
Learned Personal Rules:
{traits_formatted}
* INSTRUCTION: Align the rephrased paragraph to strictly embody this creator's voice habits and stylistic nuances.
"""

        custom_prompt_part = ""
        if custom_instruction and custom_instruction.strip():
            custom_prompt_part = f"\nUser's Current Custom Instruction: \"{custom_instruction.strip()}\""

        prompt = f"""
You are an expert script editor and speech linguist.
Your mission is to rewrite the paragraph below as ONE smooth, cohesive, naturally-flowing paragraph, the way a polished narrator would read it aloud.
{tone_guidance}
{memory_prompt_part}
{custom_prompt_part}

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
