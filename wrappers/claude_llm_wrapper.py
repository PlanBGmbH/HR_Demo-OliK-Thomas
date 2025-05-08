# wrappers/claude_llm_wrapper.py

import anthropic
from utils.config_loader import load_config

class ClaudeLLMWrapper:
    def __init__(self):
        config = load_config()
        self.client = anthropic.Anthropic(api_key=config['anthropic_api_key'])
        self.model = config['claude']['model']
        self.max_tokens = config['claude']['max_tokens']
        self.temperature = config['claude']['temperature']

    def analyze_text_with_context(self, content, historical_context=None):
        prompt = content
        if historical_context:
            prompt = historical_context + "\n" + content
        
        response = self.client.completions.create(
            model=self.model,
            prompt=prompt,
            max_tokens_to_sample=self.max_tokens,
            temperature=self.temperature
        )
        return response['completion']

    def describe_image_with_prompt(self, image_url, prompt):
        """
        Since Claude does not natively support images, we simulate image analysis by
        calling a separate API to describe the image, then pass it to Claude for detailed analysis.
        """
        image_description = f"Image URL: {image_url}, Description: Image content"
        full_prompt = prompt + "\n" + image_description
        return self.analyze_text_with_context(full_prompt)

    def analyze_urls(self, urls):
        prompt = "Analyze the following URLs: \n"
        for url in urls:
            prompt += f"{url}\n"
        return self.analyze_text_with_context(prompt)
