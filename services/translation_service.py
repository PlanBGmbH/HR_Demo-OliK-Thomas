# services/translation_service.py

from utils.config_loader import get_provider

class TranslationService:
    def __init__(self):
        provider = get_provider('translation_provider')
        if provider == "azure":
            from wrappers.azure_translation_wrapper import AzureTranslationWrapper
            self.service = AzureTranslationWrapper()
        elif provider == "google":
            from wrappers.google_translation_wrapper import GoogleTranslationWrapper
            self.service = GoogleTranslationWrapper()
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def translate_text(self, text, target_language):
        print(f"TEXT TO TRANSLATE = {text}")
        print(f"LANGUAGE TO TRANSLATE TO = {target_language}")
        return self.service.translate_text(text, target_language)
