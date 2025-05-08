# wrappers/azure_translation_wrapper.py

import requests
from utils.secrets_loader import load_secrets

class AzureTranslationWrapper:
    def __init__(self):
        # Load secrets for translation
        secrets = load_secrets()
        self.endpoint = f"{secrets['azure_translate_endpoint']}"
        self.subscription_key = secrets['azure_translate_key']
        self.subscription_region = secrets['azure_translate_region']

    def translate_text(self, text: str, target_language: str) -> str:
        headers = {
            'Ocp-Apim-Subscription-Key': self.subscription_key,
            'Ocp-Apim-Subscription-Region': self.subscription_region,
            'Content-Type': 'application/json'
        }

        body = [{
            'text': text
        }]

        params = {
            'to': target_language
        }

        print(f"INSIDE AZURE TRANSLATE = {headers} + {body} + {params}")
        try:
            # Make the request to the Azure Translator API to translate the text
            response = requests.post(self.endpoint, headers=headers, params=params, json=body)
            response_data = response.json()
            
            if response.status_code == 200:
                # Extract the translated text from the response
                return response_data[0]['translations'][0]['text']
            else:
                # Handle errors and return the status code for debugging
                error_message = response_data.get('error', {}).get('message', 'Unknown error')
                return f"Translation failed: {response.status_code} - {error_message}"
        except Exception as e:
            return f"Error: {str(e)}"
