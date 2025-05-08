# services/text_extraction_service.py

from utils.config_loader import get_provider

class TextExtractionService:
    def __init__(self, provider, azure_service=None, google_service=None):
        provider = get_provider('text_extraction_provider')
        if provider == "azure":
            from wrappers.azure_text_extraction_wrapper import AzureTextExtractionWrapper
            self.azure_service = azure_service
        elif provider == "google":
            from wrappers.google_text_extraction_wrapper import GoogleTextExtractionWrapper
            self.google_service = google_service
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def extract_text(self, document_path):
        if self.provider == "azure":
            return self.azure_service.extract_text(document_path)
        elif self.provider == "google":
            return self.google_service.extract_text(document_path)
        else:
            raise ValueError(f"Unsupported text extraction provider: {self.provider}")
