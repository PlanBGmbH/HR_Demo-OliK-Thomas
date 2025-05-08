# wrappers/openai_llm_wrapper.py

from openai import AzureOpenAI
import logging
from utils.config_loader import load_config
from utils.secrets_loader import load_secrets
from openai import BadRequestError, AuthenticationError, RateLimitError



class AzureOpenAILLMWrapper:
    def __init__(self):
        config = load_config()
        secrets = load_secrets()
        # Azure OpenAI API key and endpoint
        #openai.api_type = "azure"
        #openai.api_base = secrets['azure_openai_endpoint']  # e.g., https://<your-resource-name>.openai.azure.com/
        #openai.api_version = "2024-05-15-preview"  # Use the correct API version
        #openai.api_key = secrets['azure_openai_api_key']
        self.model = config['azure_openai']['model']  # Azure model name
        self.max_tokens = config['azure_openai']['max_tokens']
        self.temperature = config['azure_openai']['temperature']

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

            client = AzureOpenAI(
                api_key="da94da3e8df344b28334802553cff4b1",  
                api_version="2024-05-01-preview",
                azure_endpoint = "https://gtwesteurope.openai.azure.com/"
                )
                
            deployment_name='gtazureopenai' #This will correspond to the custom name you chose for your deployment when you deployed a model. Use a gpt-35-turbo-instruct deployment. 
            print(f"deployment = {deployment_name}")
             # Send the prompt to the OpenAI API
            response = client.chat.completions.create(
                model=deployment_name,
                messages=[{"role": "system", "content": html_prompt}],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            print(f"OpenAI response INSIDE openai wrapper analyze_text_with_context = {response.choices[0].message.content.strip()}")
            # Log the successful response from OpenAI
            #logging.info("Received response from OpenAI")

            return response.choices[0].message.content.strip()
    
        except BadRequestError as e:
            return f"Azure OpenAI Bad Request Error: {str(e)}"

        except AuthenticationError as e:
            return f"Azure OpenAI Authentication Error: {str(e)}"

        except RateLimitError as e:
            return f"Azure OpenAI Rate Limit Error: {str(e)}"

        except Exception as e:
            return f"An unexpected error occurred: {str(e)}"
        
        
    def analyze_text_key_points(self, content, prompt):
        print("I am in analyze text key points")
        try:
            # Combine content and prompt into a single prompt for LLM
            full_prompt = content
            if isinstance(content, list):
                # If content is a list, join its elements into a single string
                full_prompt = prompt + "\n" + "\n".join(content)
            else:
                # If content is already a string, concatenate it directly
                full_prompt = prompt + "\n" + content

            client = AzureOpenAI(
                api_key="da94da3e8df344b28334802553cff4b1",  
                api_version="2024-05-01-preview",
                azure_endpoint = "https://gtwesteurope.openai.azure.com/"
                )
                
            deployment_name='gtazureopenai' #This will correspond to the custom name you chose for your deployment when you deployed a model. Use a gpt-35-turbo-instruct deployment. 
            

             # Send the prompt to the OpenAI API
            response = client.chat.completions.create(
                #engine=self.engine,
                model=deployment_name,
                messages=[
                    {"role": "system", "content": "Assistant is a large language model trained by OpenAI."},
                    {"role": "user", "content": full_prompt}
                    ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            print(f"RESPONSE FROM TEXT KEY POINTS: {response.choices[0].message.content.strip()}")
            return response.choices[0].message.content.strip()
        
        except BadRequestError as e:
            return f"Azure OpenAI Bad Request Error: {str(e)}"

        except AuthenticationError as e:
            return f"Azure OpenAI Authentication Error: {str(e)}"

        except RateLimitError as e:
            return f"Azure OpenAI Rate Limit Error: {str(e)}"

        except Exception as e:
            return f"An unexpected error occurred: {str(e)}"

    def describe_image_with_prompt(self, image_url, prompt):
        """
        Passes a specific prompt to OpenAI for analyzing an image in detail.
        """
        response = openai.Image.create(
            engine=self.engine,
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
        
        response = openai.chat.completions.create(
            engine=self.engine,
            messages=[{"role": "system", "content": prompt}],
            max_tokens=self.max_tokens,
            temperature=self.temperature
        )
        return response.choices[0].message.content
    
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
            engine=self.engine,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        print(f"[DEBUG] OpenAI response: {response.choices[0].message.content}")
        return response.choices[0].message.content
    

