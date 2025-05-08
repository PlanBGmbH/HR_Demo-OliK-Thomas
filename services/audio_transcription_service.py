# services/audio_transcription_service.py

from utils.config_loader import get_provider
import subprocess
import os
from flask import session

class AudioTranscriptionService:
    def __init__(self):
        provider = get_provider('audio_transcription_provider')
        if provider == "azure":
            from wrappers.azure_audio_transcription_wrapper import AzureAudioTranscriptionWrapper
            self.service = AzureAudioTranscriptionWrapper()
        elif provider == "google":
            from wrappers.google_audio_transcription_wrapper import GoogleAudioTranscriptionWrapper
            self.service = GoogleAudioTranscriptionWrapper()
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def transcribe_audio(self, audio_path):
        """
        Transcribes the audio using the appropriate provider (Azure/Google). Converts
        MP3 files to WAV for better transcription quality if necessary.
        :param audio_path: Path to the audio file (WAV or MP3).
        :return: Transcription text.
        """
        print(f"AUDIO PATH: {audio_path}")
        # Check if transcription already exists for the audio file
        # transcription = session.get(f'transcription_{audio_path}', None)
        # if transcription:
        #     return transcription
        
        # Convert MP3 to WAV if needed for transcription accuracy
        if audio_path.endswith(".mp3"):
            audio_path = self._convert_mp3_to_wav(audio_path)

        # If not, proceed with transcription and store it
        transcription = self.service.transcribe_audio(audio_path)
        # session[f'transcription_{audio_path}'] = transcription

        return transcription

    def _convert_mp3_to_wav(self, audio_path):
        """
        Converts an MP3 file to a WAV format using FFmpeg for better transcription accuracy.
        :param audio_path: Path to the MP3 file.
        :return: Path to the newly converted WAV file.
        """
        wav_path = audio_path.replace(".mp3", ".wav")
        command = f"ffmpeg -i {audio_path} {wav_path}"
        subprocess.run(command, shell=True, check=True)

        if not os.path.exists(wav_path):
            raise Exception(f"Failed to convert {audio_path} to WAV format.")
        
        return wav_path

