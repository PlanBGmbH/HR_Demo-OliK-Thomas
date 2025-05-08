# wrappers/azure_image_description_wrapper.py

from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials
from utils.config_loader import load_config

class AzureImageDescriptionWrapper:
    def __init__(self):
        secrets = load_config()
        self.client = ComputerVisionClient(
            secrets['azure_computervision_endpoint'],
            CognitiveServicesCredentials(secrets['azure_computervision_key'])
        )

    def describe_image(self, image_path):
        with open(image_path, 'rb') as image_file:
            description = self.client.describe_image_in_stream(image_file)
            return description.captions
