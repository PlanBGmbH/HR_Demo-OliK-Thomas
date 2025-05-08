# services/audio_extraction_service.py

from utils.config_loader import get_provider
from wrappers.azure_audio_extraction_wrapper import AzureAudioExtractionWrapper

class AudioExtractionService:
    def __init__(self):
        provider = get_provider('audio_extraction_provider')
        if provider == "azure":
            self.service = AzureAudioExtractionWrapper()
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def extract_audio(self, audio_path):
        return self.service.extract_audio(audio_path)
