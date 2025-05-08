import boto3
import requests
from utils.secrets_loader import load_secrets

class AWSFaceRecognitionWrapper:
    def __init__(self):
        secrets = load_secrets()
        self.client = boto3.client(
            'rekognition',
            aws_access_key_id=secrets['aws_access_key_id'],
            aws_secret_access_key=secrets['aws_secret_access_key'],
            region_name=secrets['aws_region_name']
        )

    def recognize_faces(self, image_path):
        with open(image_path, 'rb') as image_file:
            # Use Celebrity Recognition
            rekognition_response = self.client.recognize_celebrities(
                Image={'Bytes': image_file.read()}
            )
        return rekognition_response
