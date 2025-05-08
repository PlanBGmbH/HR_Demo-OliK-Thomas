import openai
import json
from guardrails.validators import Validator, ValidationResult, FailResult, PassResult, register_validator

@register_validator(name="TopicValidatorWithLLM", data_type="string")
class TopicValidatorWithLLM(Validator):
    def __init__(self, valid_topics=None, invalid_topics=None, model="gpt-4-0613", on_fail="reask"):
        super().__init__(on_fail=on_fail)
        self.on_fail = on_fail
        self.valid_topics = valid_topics or []
        self.invalid_topics = invalid_topics or []
        self.model = model

    def _llm_validate(self, text: str) -> dict:
        # Use OpenAI function calling to return structured JSON output
        messages = [
            {"role": "system", "content": "You are a validator that checks if a text discusses valid or invalid topics."},
            {"role": "user", "content": f"Check if the following text contains valid topics ({self.valid_topics}) or invalid topics ({self.invalid_topics})."}
        ]

        functions = [
            {
                "name": "validate_topics",
                "description": "Validate if the text contains valid and invalid topics.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "valid_topics": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Valid topics found in the text"
                        },
                        "invalid_topics": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Invalid topics found in the text"
                        }
                    },
                    "required": ["valid_topics", "invalid_topics"]
                }
            }
        ]

        response = openai.chat.completions.create(
            model=self.model,
            messages=messages,
            functions=functions,
            function_call={"name": "validate_topics"},
            max_tokens=200
        )

        # Parse the function call arguments (which are returned as a string)
        function_arguments = response.choices[0].message.function_call.arguments
        return json.loads(function_arguments)  # Convert string to a dictionary

    def _validate(self, value: str, metadata: dict) -> ValidationResult:
        llm_response = self._llm_validate(value)
        invalid_found = llm_response.get("invalid_topics", [])
        valid_found = llm_response.get("valid_topics", [])
        
        print(f"[DEBUG] Invalid Topics Found: {invalid_found}")


        if not invalid_found:
            return PassResult()  # Pass if no invalid topics found

        error_message = f"Invalid topics found: {', '.join(invalid_found)}"
        
        if self.on_fail == "exception":
            return FailResult(error_message=error_message)

        if self.on_fail == "reask":
            # Reask with instructions to exclude the invalid topics
            reask_message = [
                {"role": "system", "content": "You are a validator that excludes invalid topics from a text."},
                {"role": "user", "content": f"Rewrite this text excluding the following invalid topics: {', '.join(invalid_found)}. The text is: {value}"}
            ]
            
            reask_response = openai.chat.completions.create(
                model=self.model,
                messages=reask_message,
                #max_tokens=300
            )
            
            corrected_value = reask_response.choices[0].message.content
            return FailResult(error_message=error_message, fix_value=corrected_value)

        return FailResult(error_message="Validation failed.")
"""
from guardrails import Guard

guard = Guard().use(
    TopicValidatorWithLLM(valid_topics=["technology", "sports"], invalid_topics=["politics", "religion"], on_fail="reask")
)

output = guard.validate("This text talks about politics and its impact on technology. It also mentions Islam and Donald Trump, the sports that are religiously allowed, and the sports Donald Trump Plays.")
print(output)
"""
