# services/object_detection_service.py

from utils.config_loader import get_provider

class ObjectDetectionService:
    def __init__(self):
        provider = get_provider('object_detection_provider')
        if provider == "azure":
            from wrappers.azure_object_detection_wrapper import AzureObjectDetectionWrapper
            self.service = AzureObjectDetectionWrapper()
        elif provider == "google":
            from wrappers.google_object_detection_wrapper import GoogleObjectDetectionWrapper
            self.service = GoogleObjectDetectionWrapper()
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def detect_objects(self, image_path):
        return self.service.detect_objects(image_path)

