# text_to_speech_service.py

from wrappers.azure_text_to_speech_wrapper import AzureTextToSpeechWrapper
from utils.config_loader import load_config

class TextToSpeechService:
    def __init__(self):
        config = load_config()
        provider = config.get('text_to_speech_provider', 'azure')
        
        # Based on provider, initialize the corresponding wrapper
        if provider == 'azure':
            self.wrapper = AzureTextToSpeechWrapper()
        # Add more providers as needed (e.g., Google)
    
    def speak_text(self, text, language):
        return self.wrapper.speak_text(text, language)
