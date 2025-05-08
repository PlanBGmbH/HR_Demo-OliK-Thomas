# services/language_detection_service.py

from utils.config_loader import get_provider

class LanguageDetectionService:
    def __init__(self):
        """
        Initializes the LanguageDetectionService with the given provider.
        
        :param provider: The provider to use for language detection ('azure' or 'google').
        """
        provider = get_provider('language_detection_provider')

        if provider == "azure":
            from wrappers.azure_language_detection_wrapper import AzureLanguageDetectionWrapper
            self.service = AzureLanguageDetectionWrapper()
        elif provider == "google":
            from wrappers.google_language_detection_wrapper import GoogleLanguageDetectionWrapper
            self.service = GoogleLanguageDetectionWrapper()
        else:
            raise ValueError(f"Unsupported language detection provider: {self.provider}")

    def detect_language(self, text):
        """
        Detects the language of the provided text based on the selected provider.

        :param text: The text for which the language is to be detected.
        :return: The detected language as a string.
        :raises ValueError: If an unsupported provider is specified.
        """
        try:
            return self.service.detect_language(text)
        except Exception as e:
            raise RuntimeError(f"Error during language detection: {str(e)}")
