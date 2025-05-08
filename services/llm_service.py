# services/llm_service.py

from utils.config_loader import get_provider

class Llmservice:
    def __init__(self):
        provider = get_provider('llm_provider')
        
        if provider == "openai":
            from wrappers.openai_llm_wrapper import OpenAILLMWrapper
            self.service = OpenAILLMWrapper()
        elif provider == "claude":
            from wrappers.claude_llm_wrapper import ClaudeLLMWrapper
            self.service = ClaudeLLMWrapper()
        elif provider == "google_gemini":
            from wrappers.google_gemini_llm_wrapper import GoogleGeminiLLMWrapper
            self.service = GoogleGeminiLLMWrapper()
        elif provider == "llama":
            from wrappers.llama_llm_wrapper import LLaMALLMWrapper
            self.service = LLaMALLMWrapper()
        elif provider == "azureopenai":
            from wrappers.azureopenai_llm_wrapper import AzureOpenAILLMWrapper
            self.service = AzureOpenAILLMWrapper()
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

    def analyze_content(self, content_list, prompt):
        """
        Accepts a list of content (documents, images, etc.) and sends them to the selected LLM provider for analysis.
        """
        print(f"CONTENT INSIDE analyze_content = {content_list}")
        print(f"PROMPT INSIDE analyze_content = {prompt}")
        combined_content = content_list#self._combine_content(content_list)
        try:
            return self.service.analyze_text_with_context(combined_content, prompt)
        except Exception as e:
            print(f"Error in analyze_content: {e}")
            return None
        
    def analyze_urls(self, urls):
        return self.service.analyze_urls(urls)

    def describe_image_with_prompt(self, image_url, prompt):
        return self.service.describe_image_with_prompt(image_url, prompt)

    def _combine_content(self, content_list):
        """
        Combines multiple content inputs (images, documents) into a single string.
        """
        combined = ""
        for content in content_list:
            combined += content + "\n"
        return combined

    def analyze_text_with_context(self, context, prompt):
        """
        Analyzes the given text with the provided context using the OpenAI LLM.

        :param text: The text to analyze
        :param context: The context to provide to the LLM
        :return: The result of the LLM analysis
        """
        print(f"CONTENT INSIDE analyze_text_with_context = {context}")
        print(f"PROMPT INSIDE analyze_text_with_context = {prompt}")
        # Call the OpenAI wrapper's method to analyze the text with context
        return self.service.analyze_text_with_context(context, prompt)
    
    def analyze_text_key_points(self, context, prompt):
        # Call the OpenAI wrapper's method to analyze the text with context
        return self.service.analyze_text_key_points(context, prompt)
    
    def guardrails_query_openai(self,prompt):
    
        return self.service.guardrails_query_openai(prompt)
    
    def generate_follow_on_prompts(self, result_text):
        # Delegating the call to OpenAIWrapper
        return self.service.generate_follow_on_prompts(result_text)