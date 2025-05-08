# wrappers/azure_language_detection_wrapper.py

from utils.config_loader import load_config
from utils.secrets_loader import load_secrets
import requests
        
class AzureLanguageDetectionWrapper:
    def __init__(self):
        secrets = load_secrets()
        self.endpoint = secrets['azure_detectlanguage_endpoint']
        self.subscription_key = secrets['azure_detectlanguage_key']
        self.subscription_region = secrets['azure_detectlanguage_region']

    def detect_language(self, text: str) -> dict:
        headers = {
            'Ocp-Apim-Subscription-Key': self.subscription_key,
            'Ocp-Apim-Subscription-Region': self.subscription_region,
            'Content-Type': 'application/json'
        }

        body = [{'text': text}]

        response = requests.post(self.endpoint, headers=headers, json=body)
        response_data = response.json()
        
        if response.status_code == 200:
            return {'language': response_data[0]['language']}
        else:
            return {'error': 'Language detection failed'}, response.status_code
