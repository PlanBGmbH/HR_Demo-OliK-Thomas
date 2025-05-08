# wrappers/llama_llm_wrapper.py

from llama_api import LLaMAClient
from utils.config_loader import load_config

class LLaMALLMWrapper:
    def __init__(self):
        config = load_config()
        self.client = LLaMAClient(api_key=config['llama_api_key'])
        self.model = config['llama']['model']
        self.max_tokens = config['llama']['max_tokens']
        self.temperature = config['llama']['temperature']

    def analyze_text_with_context(self, content, historical_context=None):
        prompt = content
        if historical_context:
            prompt = historical_context + "\n" + content

        response = self.client.generate(
            model=self.model,
            prompt=prompt,
            max_tokens=self.max_tokens,
            temperature=self.temperature
        )
        return response['generated_text']

    def describe_image_with_prompt(self, image_url, prompt):
        """
        Simulates image analysis by passing a URL and additional prompt to LLaMA.
        """
        prompt = prompt + f" Image URL: {image_url}"
        return self.analyze_text_with_context(prompt)

    def analyze_urls(self, urls):
        prompt = "Analyze the following URLs: \n"
        for url in urls:
            prompt += f"{url}\n"
        return self.analyze_text_with_context(prompt)
