# wrappers/google_audio_transcription_wrapper.py

from google.cloud import speech
import os
from utils.secrets_loader import get_secret

class GoogleAudioTranscriptionWrapper:
    def __init__(self):
        # Load Google Cloud service account path from secrets.json
        self.credentials_path = get_secret("google", "application_credentials")
        
        # Set the GOOGLE_APPLICATION_CREDENTIALS environment variable
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self.credentials_path

        # Initialize the Google Speech-to-Text client
        self.client = speech.SpeechClient()

    def transcribe_audio(self, audio_path):
        """
        Transcribes the given audio file using Google's Speech-to-Text service.
        :param audio_path: Path to the audio file.
        :return: Transcription text.
        """
        # Load the audio file content
        with open(audio_path, 'rb') as audio_file:
            content = audio_file.read()

        # Configure the audio for Google Speech API
        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
        )

        # Perform the transcription
        response = self.client.recognize(config=config, audio=audio)

        # Collect the transcription result
        transcription = ""
        for result in response.results:
            transcription += result.alternatives[0].transcript

        if not transcription:
            raise Exception(f"No speech could be recognized in the audio file: {audio_path}")

        return transcription
