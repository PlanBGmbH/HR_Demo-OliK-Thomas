# wrappers/aws_facial_analysis_wrapper.py

import boto3
from utils.secrets_loader import load_secrets

class AWSFacialAnalysisWrapper:
    def __init__(self):
        secrets = load_secrets()
        self.client = boto3.client(
            'rekognition',
            aws_access_key_id= secrets['aws_access_key_id'],
            aws_secret_access_key= secrets['aws_secret_access_key'],
            region_name= secrets['aws_region_name']
        )

    def analyze_faces(self, image_path):
        with open(image_path, 'rb') as image_file:
            response = self.client.detect_faces(
                Image={'Bytes': image_file.read()},
                Attributes=['ALL']
            )
        return response
