# services/image_processing_service.py

import os
from services.image_description_service import ImageDescriptionService

class ImageProcessingService:
    def __init__(self):
        self.image_description_service = ImageDescriptionService()

    def analyze_images_in_folder(self, folder_path):
        """
        Analyzes all images in the specified folder.
        :param folder_path: Path to the folder containing the key frames.
        :return: List of image analysis results.
        """
        results = []
        for filename in os.listdir(folder_path):
            if filename.endswith(".png") or filename.endswith(".jpg"):
                image_path = os.path.join(folder_path, filename)
                result = self.image_description_service.describe_image(image_path)
                results.append(result)
        
        return results
