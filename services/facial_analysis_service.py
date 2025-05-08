# services/facial_analysis_service.py

from utils.config_loader import get_provider
from wrappers.aws_facial_analysis_wrapper import AWSFacialAnalysisWrapper

class FacialAnalysisService:
    def __init__(self):
        provider = get_provider('facial_analysis_provider')
        if provider == "aws":
            self.service = AWSFacialAnalysisWrapper()
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def analyze_faces(self, image_path):
        return self.service.analyze_faces(image_path)
