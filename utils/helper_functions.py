# utils/helper_functions.py

def count_tokens(text):
    """
    Function to estimate token usage for a given text.
    :param text: The text to be analyzed
    :return: Approximate token count
    """
    if text is None:
        text = ""  # Default to empty string if text is None
    return len(text.split())  # Basic token count


