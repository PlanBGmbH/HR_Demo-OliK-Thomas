import subprocess
import os
import uuid
from flask import session
from services.audio_transcription_service import AudioTranscriptionService
from services.image_processing_service import ImageProcessingService

class VideoProcessingService:
    def __init__(self):
        self.audio_service = AudioTranscriptionService()
        self.image_service = ImageProcessingService()

    def generate_temp_file(self, extension):
        """Generates a unique temporary file name."""
        return f"static/uploads/{uuid.uuid4()}.{extension}"

    def extract_audio(self, video_path, audio_output_path):
        """
        Extracts audio from the provided video file using FFmpeg.
        :param video_path: Path to the video file.
        :param audio_output_path: Path where the extracted audio will be saved.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        # Use FFmpeg to extract audio safely
        command = ['ffmpeg', '-i', video_path, '-vn', '-acodec', 'pcm_s16le', audio_output_path]
        subprocess.run(command, check=True)

        if not os.path.exists(audio_output_path):
            raise Exception(f"Failed to extract audio from video: {video_path}")
        
        return audio_output_path

    def extract_key_frames(self, video_path, frames_output_folder, fps=1):
        """
        Extracts key frames from the provided video file using FFmpeg.
        :param video_path: Path to the video file.
        :param frames_output_folder: Folder where the extracted frames will be saved.
        :param fps: Number of frames to extract per second.
        """
        if not os.path.exists(frames_output_folder):
            os.makedirs(frames_output_folder)
        
        # Safely extract key frames
        command = ['ffmpeg', '-i', video_path, '-vf', f'fps={fps}', f'{frames_output_folder}/frame_%04d.png']
        subprocess.run(command, check=True)

    def process_video(self, video_path, prompt):
        """
        Processes the video by extracting audio, key frames, and delegating to other services.
        :param video_path: Path to the video file.
        :param prompt: User-provided prompt (for future extensions).
        :return: Transcription of the audio and analysis of key frames.
        """
        # Generate unique file paths for audio and frames
        audio_output_path = self.generate_temp_file('wav')
        frames_output_folder = f"static/uploads/frames_{uuid.uuid4()}"

        # Step 1: Extract audio from video
        self.extract_audio(video_path, audio_output_path)

        # # Check if the transcription already exists in session
        # transcription = session.get(f'transcription_{video_path}', None)
        # if transcription:
        #     return transcription
        
        # Step 2: Use the audio transcription service to transcribe the audio
        audio_transcription = self.audio_service.transcribe_audio(audio_output_path)

        # Step 3: (Optional) Extract key frames from the video
        # self.extract_key_frames(video_path, frames_output_folder)

        # Step 4: (Optional) Analyze key frames using the image processing service
        # key_frame_analysis = self.image_service.analyze_images_in_folder(frames_output_folder)

        # Step 5: Clean up temporary files
        if os.path.exists(audio_output_path):
            os.remove(audio_output_path)
        # Optionally remove extracted frames folder if not needed
        # if os.path.exists(frames_output_folder):
        #     os.rmdir(frames_output_folder)

        # Return transcription result
        return audio_transcription
        # If you want to return both, uncomment below and add key_frame_analysis
        # return {
        #     "audio_transcription": audio_transcription,
        #     "key_frame_analysis": key_frame_analysis
        # }

