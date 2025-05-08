# services/face_recognition_service.py

from utils.config_loader import get_provider
from wrappers.aws_face_recognition_wrapper import AWSFaceRecognitionWrapper

class FaceRecognitionService:
    def __init__(self):
        provider = get_provider('face_recognition_provider')
        if provider == "aws":
            self.service = AWSFaceRecognitionWrapper()
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def recognize_faces(self, image_path):
        return self.service.recognize_faces(image_path)
