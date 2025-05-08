# azure_text_to_speech_wrapper.py

import azure.cognitiveservices.speech as speechsdk
from utils.secrets_loader import load_secrets

class AzureTextToSpeechWrapper:
    def __init__(self):
        secrets = load_secrets()
        # Load Azure Speech SDK credentials from secrets.json
        azure_speech_key = secrets["azure_speech_key"]
        azure_speech_region = secrets["azure_speech_region"]
        # Initialize the speech configuration
        self.speech_config = speechsdk.SpeechConfig(subscription=azure_speech_key, region=azure_speech_region)
    
    def speak_text(self, text, language='en-US'):
        # Set the speech language
        self.speech_config.speech_synthesis_language = language

        # Initialize the speech synthesizer
        speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=self.speech_config)
        
        # Perform the speech synthesis
        result = speech_synthesizer.speak_text_async(text).get()
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            print("Speech synthesis completed successfully.")
        else:
            print(f"Speech synthesis failed. Error: {result.error_details}")

        return result
