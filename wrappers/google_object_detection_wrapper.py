# wrappers/google_object_detection_wrapper.py

from google.cloud import vision
from utils.config_loader import load_config

class GoogleObjectDetectionWrapper:
    def __init__(self):
        self.client = vision.ImageAnnotatorClient()

    def detect_objects(self, image_path):
        with open(image_path, 'rb') as image_file:
            content = image_file.read()
            image = vision.Image(content=content)

        response = self.client.object_localization(image=image)
        objects = response.localized_object_annotations

        results = []
        for obj in objects:
            results.append({
                'name': obj.name,
                'score': obj.score,
                'bounding_poly': obj.bounding_poly
            })
        return results
