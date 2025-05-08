# wrappers/azure_object_detection_wrapper.py

from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials
from utils.config_loader import load_config

class AzureObjectDetectionWrapper:
    def __init__(self):
        config = load_config()
        self.client = ComputerVisionClient(
            config['azure_computervision_endpoint'],
            CognitiveServicesCredentials(config['azure_computervision_key'])
        )

    def detect_objects(self, image_path):
        with open(image_path, 'rb') as image_file:
            objects = self.client.detect_objects_in_stream(image_file)
            return [{'name': obj.object_property, 'confidence': obj.confidence} for obj in objects.objects]
