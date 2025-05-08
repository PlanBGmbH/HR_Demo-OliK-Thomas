# wrappers/openai_llm_wrapper.py

import openai
import logging
from utils.config_loader import load_config
from utils.secrets_loader import load_secrets

class OpenAILLMWrapper:
    def __init__(self):
        config = load_config()
        secrets = load_secrets()
        openai.api_key = secrets['openai_api_key']
        self.model = config['openai']['model']
        self.max_tokens = config['openai']['max_tokens']
        self.temperature = config['openai']['temperature']

    def analyze_text_with_context(self, content, prompt):
        print(f"CONTENT INSIDE openai wrapper analyze_text_with_context = {content}")
        print(f"PROMPT INSIDE openai wrapper analyze_text_with_context = {prompt}")
        try:
            # Combine content and prompt into a single prompt for LLM
            full_prompt = content
            if prompt:
                full_prompt = prompt + "\n" + content
            print(f"FULL PROMPT INSIDE openai wrapper analyze_text_with_context = {full_prompt}")
            # Log the prompt being sent to the LLM
            #logging.info(f"Sending prompt to OpenAI: {full_prompt}")

            html_prompt = self.create_prompt_with_markup(content, prompt)
            print(f"HTML PROMPT INSIDE openai wrapper analyze_text_with_context = {html_prompt}")
             # Send the prompt to the OpenAI API
            response = openai.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": html_prompt}],
                max_tokens=self.max_tokens,
                temperature=0,#self.temperature,
                seed=12345,  # Set a seed for consistent output
                top_p=0
            )
            print(f"OpenAI response INSIDE openai wrapper analyze_text_with_context = {response.choices[0].message.content.strip()}")
            # Log the successful response from OpenAI
            #logging.info("Received response from OpenAI")

            return response.choices[0].message.content.strip()
    
        except openai.error.OpenAIError as e:
            # Catch specific OpenAI API errors and log the details
            #logging.error(f"OpenAI API Error: {str(e)}")
            return f"Error during LLM analysis: {str(e)}"

        except Exception as e:
            # Catch all other potential exceptions and log the details
            #logging.error(f"Unexpected error in analyze_text_with_context: {str(e)}")
            return f"An unexpected error occurred: {str(e)}"
        
        
    def analyze_text_key_points(self, content, prompt):
        try:
            # Combine content and prompt into a single prompt for LLM
            print(f"starting analyze_text_key_points  = {content}")
            full_prompt = content
            if isinstance(content, list):
                # If content is a list, join its elements into a single string
                full_prompt = prompt + "\n" + "\n".join(content)
            else:
                # If content is already a string, concatenate it directly
                full_prompt = prompt + "\n" + content

             # Send the prompt to the OpenAI API
            response = openai.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": full_prompt}],
                max_tokens=self.max_tokens,
                temperature=0,#self.temperature,
                seed=12345,  # Set a seed for consistent output
                top_p=0
            )

            return response.choices[0].message.content.strip()
    
        except openai.error.OpenAIError as e:
            # Catch specific OpenAI API errors and log the details
            #logging.error(f"OpenAI API Error: {str(e)}")
            return f"Error during LLM analysis: {str(e)}"

        except Exception as e:
            # Catch all other potential exceptions and log the details
            #logging.error(f"Unexpected error in analyze_text_with_context: {str(e)}")
            return f"An unexpected error occurred: {str(e)}"

    def describe_image_with_prompt(self, image_url, prompt):
        """
        Passes a specific prompt to OpenAI for analyzing an image in detail.
        """
        response = openai.Image.create(
            model=self.model,
            prompt=prompt,
            image_url=image_url,
            max_tokens=self.max_tokens
        )
        return response.choices[0].text

    def analyze_urls(self, urls):
        """
        Sends multiple URLs (images, documents) to OpenAI for analysis.
        """
        prompt = "Analyze the following content: \n"
        for url in urls:
            prompt += f"{url}\n"
        
        response = openai.ChatCompletion.create(
            model=self.model,
            messages=[{"role": "system", "content": prompt}],
            max_tokens=self.max_tokens,
            temperature=self.temperature
        )
        return response.choices[0].message['content']
    
    def create_prompt_with_markup(self, content, prompt):
        print("INSIDE CREATE PROMPT WITH MARKUP")
        base_prompt = f"""
        Please analyze the following content based on the prompt below and provide a detailed, well-structured response in Markdown format with appropriate headings, bullet points, tables, and image URLs (If image URLs are in content). Do not include any styles, and use simple Markdown syntax:

        Prompt:
        {prompt}

        Content:
        {content}
        """
        print(f"PROMPT INSIDE create_prompt_with_markup = {base_prompt}")
        return base_prompt
    
    def guardrails_query_openai(self,prompt):
        print(f"[DEBUG] Querying OpenAI with prompt: {prompt}")
        prompt = prompt + "\n" + " Provide a detailed, well-structured response in Markdown format with appropriate headings, bullet points, tables. Do not include any styles, and use simple Markdown syntax"
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        print(f"[DEBUG] OpenAI response: {response.choices[0].message.content}")
        return response.choices[0].message.content
    
    def generate_follow_on_prompts(self, result_text):
        try:
            # Chain-of-thought prompting for follow-on prompts
            response = openai.chat.completions.create(
                model="gpt-4o",
                prompt=(
                    f"Analyze the following scoring table or document for anomalies:\n\n"
                    f"### Result:\n{result_text}\n\n"
                    "Identify any significant variances, extreme values (very high or very low scores), or major differences between vendor proposals. "
                    "Provide follow-on recommendations to investigate these anomalies."
                ),
                max_tokens=200,
                n=1,
                temperature=0.7
            )
            follow_on_prompts = response.choices[0].text.strip().split("\n")
            return [{"title": f"Recommended {i+1}", "prompt": p.strip()} for i, p in enumerate(follow_on_prompts) if p]
        except Exception as e:
            print(f"Error generating follow-on prompts: {e}")
            return []
    

