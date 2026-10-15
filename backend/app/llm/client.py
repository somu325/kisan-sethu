"""Single LLM gateway interface adhering to repository boundaries."""

import logging
from typing import Any

from google import genai
from google.genai import types

from app.settings import settings

logger = logging.getLogger(__name__)


class LLMGateway:
    """Central gateway for all Large Language Model interactions."""

    def __init__(
        self,
        api_key: str | None = None,
        project_id: str | None = None,
        location: str | None = None,
    ) -> None:
        self.api_key = api_key or settings.gemini_api_key
        self.project_id = project_id or settings.gcp_project_id
        self.location = location or settings.gcp_location
        self.model_fast = settings.model_fast or "gemini-2.5-flash"
        self.model_strong = settings.model_strong or "gemini-2.5-pro"
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client | None:
        """Lazily initialize genai Client if credentials exist."""
        if self._client is not None:
            return self._client

        if (
            self.project_id
            and not self.project_id.startswith("your_")
            and "placeholder" not in self.project_id.lower()
        ):
            logger.info("Initializing LLM Gateway in Vertex AI mode (%s)", self.project_id)
            self._client = genai.Client(
                vertexai=True,
                project=self.project_id,
                location=self.location,
            )
        elif (
            self.api_key
            and not self.api_key.startswith("your_")
            and "placeholder" not in self.api_key.lower()
        ):
            logger.info("Initializing LLM Gateway with Gemini API Key")
            self._client = genai.Client(api_key=self.api_key)
        else:
            logger.warning(
                "No valid LLM credentials configured (KS_GEMINI_API_KEY / KS_GCP_PROJECT_ID)"
            )
            return None

        return self._client

    async def generate_response(
        self,
        prompt: str,
        system_instruction: str | None = None,
        use_strong_model: bool = False,
    ) -> str:
        """Generate a grounded response for a prepared prompt."""
        model = self.model_strong if use_strong_model else self.model_fast
        client = self._get_client()

        if client is None:
            # Offline deterministic fallback for local testing without credentials
            logger.info("Using offline deterministic fallback for LLM response generation.")
            return self._generate_offline_fallback(prompt)

        try:
            config: dict[str, Any] = {"temperature": 0.2}
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(**config),
            )
            return str(response.text or "").strip()

        except Exception as exc:
            logger.error("LLM generation call failed: %s; falling back to offline generator.", exc)
            return self._generate_offline_fallback(prompt)

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Any,
        system_instruction: str | None = None,
        temperature: float = 0.0,
    ) -> str:
        """Generate structured JSON conforming strictly to response_schema with temperature 0."""
        model = self.model_fast
        client = self._get_client()

        if client is None:
            return ""

        try:
            config: dict[str, Any] = {
                "temperature": temperature,
                "response_mime_type": "application/json",
                "response_schema": response_schema,
            }
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(**config),
            )
            return str(response.text or "").strip()
        except Exception as exc:
            logger.error("Structured LLM generation failed: %s", exc)
            return ""

    async def analyze_image(
        self,
        prompt: str,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        system_instruction: str | None = None,
    ) -> str:
        """Analyze a leaf/plant image for visual disease/pest symptoms using Gemini Vision."""
        model = self.model_fast
        client = self._get_client()

        if client is None:
            return ""

        try:
            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            config: dict[str, Any] = {"temperature": 0.1}
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = client.models.generate_content(
                model=model,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(**config),
            )
            return str(response.text or "").strip()
        except Exception as exc:
            logger.error("LLM image analysis call failed: %s", exc)
            return ""

    @staticmethod
    def _generate_offline_fallback(prompt: str) -> str:
        """Generate a structured, fact-grounded response when running without active API keys."""
        lines = prompt.splitlines()
        facts_lines = [
            line.strip()
            for line in lines
            if line.strip().startswith("[") or "modal price" in line.lower()
        ]

        if not facts_lines:
            return (
                "Namaste Kisan. Currently, no recent price records are available for this crop "
                "in your nearby mandis. Please check again after the next market arrival update."
            )

        summary = facts_lines[0]
        return (
            f"Namaste Kisan! Based on today's official mandi reports:\n\n"
            f"- {summary}\n\n"
            f"Recommendation: If you have produce ready for harvest, compare prices with "
            f"adjacent mandis to maximize your profit. Check local quality grades before transport."
        )


_default_gateway: LLMGateway | None = None


def get_llm_gateway() -> LLMGateway:
    """Singleton getter for the repository LLM gateway."""
    global _default_gateway
    if _default_gateway is None:
        _default_gateway = LLMGateway()
    return _default_gateway
