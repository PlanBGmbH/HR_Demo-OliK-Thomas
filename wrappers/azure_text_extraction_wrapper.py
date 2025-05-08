# wrappers/azure_text_extraction_wrapper.py

from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials
from utils.config_loader import load_config
import time

class AzureTextExtractionWrapper:
    def __init__(self):
        config = load_config()
        self.client = ComputerVisionClient(
            config['azure_computervision_endpoint'],
            CognitiveServicesCredentials(config['azure_computervision_key'])
        )

    def extract_text(self, image_path):
        try:
            # Open the document as a binary stream
            with open(image_path, "rb") as image:
                # Call API to extract text (Text Recognition with async)
                read_response = self.client.read_in_stream(image, raw=True)

                # Get operation location (URL with an ID that allows checking the result)
                read_operation_location = read_response.headers["Operation-Location"]
                operation_id = read_operation_location.split("/")[-1]

                # Wait for the operation to complete
                while True:
                    read_result = self.client.get_read_result(operation_id)
                    if read_result.status.lower() not in ['notstarted', 'running']:
                        break
                    time.sleep(1)

                # Extract text when operation completes
                extracted_text = []
                if read_result.status == OperationStatusCodes.succeeded:
                    for page in read_result.analyze_result.read_results:
                        for line in page.lines:
                            extracted_text.append(line.text)

                # Return the extracted text as a single string
                return "\n".join(extracted_text)

        except Exception as e:
            raise RuntimeError(f"Azure text extraction error: {str(e)}")
