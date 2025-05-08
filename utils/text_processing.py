# utils/text_processing.py

import fitz  # PyMuPDF for handling PDFs
import docx  # For handling DOCX files
import time
from services.llm_service import Llmservice
from utils.helper_functions import count_tokens
from services.image_description_service import ImageDescriptionService


# Initialize the LLM service
llm_service = Llmservice()

# Extract text from PDF files
def extract_text_from_pdf(file_path):
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

# Extract text from TXT files
def extract_text_from_txt(file_path):
    with open(file_path, 'r') as file:
        return file.read()

# Extract text from DOCX files
def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return '\n'.join(full_text)

# General function to extract text based on file extension
def extract_text(file_path):
    if file_path.endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif file_path.endswith('.txt'):
        return extract_text_from_txt(file_path)
    elif file_path.endswith('.docx'):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path}")

def chunk_text_with_batching(text, max_tokens=1000, batch_size=2, delay=1):
    """
    Function to chunk text into smaller pieces based on a token limit.
    Processes text in batches to avoid exceeding API call limits.
    
    :param text: The full text to be chunked
    :param max_tokens: Maximum number of tokens allowed in each chunk
    :param batch_size: Number of chunks to process in one batch
    :param delay: Delay between successive API calls (in seconds)
    :return: Summarized and chunked text with key points
    """
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) < max_tokens:
            current_chunk.append(word)
            current_length += len(word)
        else:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_length = len(word)
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    # Use batching to process chunks and add delay between requests
    summarized_chunks = extract_key_points_in_batches(chunks, batch_size=batch_size, delay=delay)
    
    return summarized_chunks


def summarize_and_chunk_text(text, history, max_tokens):
    """
    Combines the current text with the conversation history.
    If the total number of tokens exceeds the maximum, it summarizes the older content and extracts key points.
    
    :param text: Current text from files or images
    :param history: Context history from previous interactions
    :param max_tokens: Maximum allowable token count
    :return: Summarized context with key points and current text
    """
    full_context = history + "\n" + text
    
    if len(full_context.split()) > max_tokens:
        # Summarize the older content and extract key points
        summarized_content = chunk_text(full_context, max_tokens=max_tokens // 2)
        history = summarized_content
    else:
        history = full_context
    
    return history

def extract_image_descriptions(file_paths):
    image_service = ImageDescriptionService()  # Initialize the image service
    descriptions = []

    # Iterate through the file paths to process images
    for file_path in file_paths:
        if file_path.endswith(('.jpg', '.jpeg', '.png', '.gif')):  # Check if it's an image
            description = image_service.describe_image(file_path)
            descriptions.append(description)

    return " ".join(descriptions)

def extract_key_points_in_batches(chunks, batch_size=2, delay=1):
    """
    Batch key point extraction to reduce the number of API calls.
    Adds a delay between requests to avoid RPM limits.
    
    :param chunks: List of text chunks to extract key points from.
    :param batch_size: Number of chunks to process in one batch.
    :param delay: Delay between successive API calls (in seconds).
    :return: Combined key points for all chunks.
    """
    all_key_points = []
    
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        combined_text = "\n".join(batch)

        # Call the LLM to extract key points for the batch
        key_points = llm_service.analyze_text_key_points(batch, "Extract key points from this text")
        all_key_points.append(key_points)
        
        # Introduce a delay between API calls to avoid hitting RPM limits
        if i + batch_size < len(chunks):  # Add delay only if more requests are pending
            time.sleep(delay)
    
    return "\n".join(all_key_points)

def process_text_and_history(file_paths, context_history, prompt, max_tokens):
    """
    Processes the text from uploaded files and maintains the conversation history.
    Summarizes history if the token limit is exceeded.
    
    :param file_paths: List of file paths to process
    :param context_history: Historical context from previous interactions
    :param prompt: The current prompt
    :param max_tokens: Maximum allowable token count from config.json
    :return: Updated context history with the new prompt and responses
    """
    combined_text = ""

    # Check if context_history is None or empty, initialize it as an empty string
    if context_history is None or len(context_history) == 0:
        context_history = ""

    # Loop through each file
    for file_path in file_paths:
        if file_path.lower().endswith(('.pdf', '.txt', '.docx')):
            # If the file is a document, extract text
            extracted_text = extract_text(file_path)
            combined_text += extracted_text + "\n"
        elif file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
            # If the file is an image, process image descriptions
            image_content = extract_image_descriptions(file_paths)
            combined_text += image_content + "\n"
        else:
            raise ValueError(f"Unsupported file type: {file_path}")

    # Extract text from each file
    #for file_path in file_paths:
    #    extracted_text = extract_text(file_path)  # Extracts text from files
    #    combined_text += extracted_text

    # Process image descriptions if applicable
    #image_content = extract_image_descriptions(file_paths)
    #if image_content is not None:
    #    combined_text += image_content
    
    # Ensure prompt is not None
    prompt = prompt if prompt is not None else ""

    # Combine current content with historical context
    full_context = context_history + "\n" + combined_text + "\n" + prompt

    # Check if the total tokens exceed the limit
    total_tokens = count_tokens(full_context)

    if total_tokens > max_tokens:
        # Summarize older history using chunking with batching
        summarized_content = chunk_text_with_batching(full_context, max_tokens=max_tokens // 2)
        context_history = summarized_content  # Replace older history with summarized content
    else:
        context_history = full_context

    return context_history

