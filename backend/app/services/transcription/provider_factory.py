from typing import Dict, Type, Optional
from app.services.transcription.base import TranscriptionProvider
from app.services.transcription.gemini import GeminiTranscriptionProvider
from app.core.config import settings


class TranscriptionProviderFactory:
    """Factory to instantiate transcription providers by name."""

    _registry: Dict[str, Type[TranscriptionProvider]] = {
        "gemini": GeminiTranscriptionProvider,
    }

    @classmethod
    def register_provider(cls, name: str, provider_class: Type[TranscriptionProvider]):
        cls._registry[name.lower()] = provider_class

    @classmethod
    def get_provider(cls, provider_name: Optional[str] = None) -> TranscriptionProvider:
        name = (provider_name or settings.DEFAULT_TRANSCRIPTION_PROVIDER).lower()
        provider_cls = cls._registry.get(name)
        
        if not provider_cls:
            raise ValueError(f"Transcription provider '{name}' is not registered. Available: {list(cls._registry.keys())}")
        
        return provider_cls()
