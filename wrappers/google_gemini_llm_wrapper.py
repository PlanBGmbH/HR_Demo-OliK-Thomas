# wrappers/google_gemini_llm_wrapper.py

from google.cloud import aiplatform
from utils.config_loader import load_config

class GoogleGeminiLLMWrapper:
    def __init__(self):
        config = load_config()
        self.model = config['google_gemini']['model']
        self.max_tokens = config['google_gemini']['max_tokens']
        self.temperature = config['google_gemini']['temperature']
        self.client = aiplatform.gapic.PredictionServiceClient()

    def analyze_text_with_context(self, content, historical_context=None):
        prompt = content
        if historical_context:
            prompt = historical_context + "\n" + content
        
        response = self.client.predict(
            endpoint=self.model,
            instances=[{"prompt": prompt}],
            parameters={"temperature": self.temperature, "max_output_tokens": self.max_tokens}
        )
        return response.predictions[0]["text"]

    def describe_image_with_prompt(self, image_url, prompt):
        """
        Simulates image analysis by passing a URL and additional prompt to Google Gemini.
        """
        prompt = prompt + f" Image URL: {image_url}"
        return self.analyze_text_with_context(prompt)

    def analyze_urls(self, urls):
        prompt = "Analyze the following URLs: \n"
        for url in urls:
            prompt += f"{url}\n"
        return self.analyze_text_with_context(prompt)
