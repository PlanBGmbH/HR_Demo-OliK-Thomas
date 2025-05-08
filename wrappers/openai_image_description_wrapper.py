# wrappers/openai_image_description_wrapper.py

import openai
from utils.config_loader import load_config
from utils.secrets_loader import load_secrets

class OpenAIImageDescriptionWrapper:
    def __init__(self):
        config = load_config()
        secrets = load_secrets()
        openai.api_key = secrets['openai_api_key']
        self.model = config['openai_image_description_model']  # Model for image description

    def describe_image(self, image_url,celebs_info):
        # Define the image description request including celebrity information
        if celebs_info:
            celebs_info_str = "\n".join([f"{celeb['Name']} appears {celeb['DominantEmotion'].lower()} with the following emotions: {celeb['EmotionDescription']}." for celeb in celebs_info])

            # Construct the prompt with image description and celebrity information
            prompt = f"""
            Please describe the image. The following celebrities are present in the image and their emotions are noted:

            {celebs_info_str}

            When describing the image, make sure to mention each celebrity by their name and describe their appearance and behavior based on the given emotions. Additionally, provide a general description of the scene, including any notable features or context.
            """
        else:
            # Construct the prompt without celebrity information
            prompt = """
            Please describe the image. Provide a detailed description of the scene, including any notable features or context.
            """

        print(f"***** IMAGE URL  ********  {image_url}")
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user", 
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url,
                                }
                            }
                        ]
                    }
                ]
            )
            print(f"OUTPUT FROM OPENAI IMAGE DESC = {response.choices[0].message.content.strip()}")
            return response.choices[0].message.content.strip()  # Extract the description

        except Exception as e:
            # Log or raise the exception as needed
            raise RuntimeError(f"Error during image description: {str(e)}")



