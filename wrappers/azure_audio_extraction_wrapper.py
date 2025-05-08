# wrappers/azure_audio_extraction_wrapper.py

import azure.cognitiveservices.speech as speechsdk
from utils.config_loader import load_config

class AzureAudioExtractionWrapper:
    def __init__(self):
        secrets = load_config()
        self.speech_key = secrets['azure_speech_key']
        self.region = secrets['azure_region']

    def extract_audio(self, audio_path):
        print(f"Extraction Location of Audio from azure_audio_extraction_wrapper.py = {audio_path}")
        speech_config = speechsdk.SpeechConfig(subscription=self.speech_key, region=self.region)
        audio_input = speechsdk.AudioConfig(filename=audio_path)
        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_input)
        result = recognizer.recognize_once()
        return result.text

