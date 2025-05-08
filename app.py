import os
from flask_cors import CORS
from flask import Flask, Response, render_template, request, jsonify, session, send_file, redirect, url_for
from services.image_description_service import ImageDescriptionService
from services.video_processing_service import VideoProcessingService
from services.audio_transcription_service import AudioTranscriptionService
from services.language_detection_service import LanguageDetectionService
from services.translation_service import TranslationService
from services.text_to_speech_service import TextToSpeechService
from services.llm_service import Llmservice
from services.face_recognition_service import FaceRecognitionService
from services.chart_generation_service import ChartGenerationService
from utils.topic_validator import TopicValidatorWithLLM
from utils.config_loader import load_config
from utils.file_utils import save_uploaded_files, upload_file_to_azure
from utils.helper_functions import count_tokens
from utils.text_processing import chunk_text_with_batching, extract_text, process_text_and_history
from werkzeug.utils import secure_filename
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import redis
from guardrails import Guard
# from guardrails.hub import RestrictToTopic
from guardrails.errors import ValidationError
import openai
from utils.secrets_loader import load_secrets
from collections import Counter
import re
import json
import time
from dotenv import load_dotenv
from openai import AzureOpenAI
from openai.types.beta.threads.text_content_block import TextContentBlock
from openai.types.beta.threads.image_file_content_block import ImageFileContentBlock
from msal import ConfidentialClientApplication
from datetime import datetime, timedelta
from sqlalchemy import *
from sqlalchemy.orm import sessionmaker
import uuid
import logging
from opencensus.ext.azure.log_exporter import AzureLogHandler

load_dotenv()

app = Flask(__name__)

# Logging Configuration
app.logger.disabled = True
logging.getLogger('werkzeug').disabled = True
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger()
azure_log_handler = AzureLogHandler(connection_string=os.getenv('APPLICATION_INSIGHTS_CONN_STR'))
azure_log_handler.setLevel(logging.INFO)
logger.addHandler(azure_log_handler)

CORS(app)
app.secret_key = os.urandom(24)
redis_client = redis.StrictRedis(host=os.getenv('REDIS_HOST'), port=6380, ssl=True, password=os.getenv('REDIS_PASSWORD'), db=0)
config = load_config()
secrets = load_secrets()

openai.api_key = 'sk-fYcAXpQ3pTTmSXySgQxvsn40e0o8mDg15_SxoV788xT3BlbkFJ6UqZ1uqWemZNGutPfoctyElMptwLQdD5WXKfit8bwA'

# Initialize services
image_service = ImageDescriptionService()
video_service = VideoProcessingService()
audio_service = AudioTranscriptionService()
face_service = FaceRecognitionService()
llm_service = Llmservice()
detect_language_service = LanguageDetectionService()
translate_service = TranslationService()
text_to_speech_service = TextToSpeechService()
service = ChartGenerationService()

########################################################### Required Functions for HR-Demo 

# Setup Database
# Connect to the database
__db_username = os.getenv('DATABASE_USERNAME')
__db_password = os.getenv('DATABASE_PASSWORD')
__db_name = os.getenv('DATABASE_NAME')
__db_server = os.getenv('DATABASE_SERVER')
__db_conn_str = f"mssql+pyodbc://{__db_username}:{__db_password}@{__db_server}/{__db_name}?driver=ODBC+Driver+17+for+SQL+Server"

# Create Engine
__engine = create_engine(__db_conn_str)
sessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=__engine)

# Get tables
__user_thread = Table(os.getenv('USER_THREAD_TABLE'), MetaData(), autoload_with=__engine)
__employee_table = Table(os.getenv('EMPLOYEE_TABLE'), MetaData(), autoload_with=__engine)

# Internal Function for building msal app
def __build_msal_app():
    client_id = os.getenv('CLIENT_ID')
    client_secret = os.getenv('CLIENT_SECRET')
    tenant_id = os.getenv('TENANT_ID')
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    return ConfidentialClientApplication(client_id=client_id,
                                        client_credential=client_secret,
                                        authority=authority)
# Function for login
@app.route('/login')
def login():
    base_url = os.getenv("BASE_URL")
    auth_url = __build_msal_app().get_authorization_request_url(scopes=["USER.Read"],
                                                 redirect_uri=f"{base_url}/getToken")
    return redirect(auth_url)

# Function to get the tokens
@app.route('/getToken')
def get_token():
    code = request.args.get('code')
    if not code:
        logging.error("No code found")
        return jsonify({"error": "Authorization code not found in request"}), 400
    result = __build_msal_app().acquire_token_by_authorization_code(code=code,
                                                                    scopes=["USER.Read"],
                                                                    redirect_uri=f"{os.getenv('BASE_URL')}/getToken")
    
    if "error" in result:
        msg = "Login failed: " + result.get("error_description")
        logging.error(msg)
        raise Exception(msg)
    session["user"] = result.get("id_token_claims")
    return redirect(url_for("index"))

# Function to get the user name from token
def get_user_name():
    if session.get("user"):
        logging.info("User is in session")
        user = session.get("user")
        return user["name"]
    else:
        msg = "Error getting user's name"
        logging.error(msg)
        raise Exception(msg)
    
# Setup Azure Open AI client
client = AzureOpenAI(
    azure_endpoint=os.getenv('AZURE_ENDPOINT'),
    api_key=os.getenv('API_KEY'),
    api_version=os.getenv('API_VERSION')
)

# Function for Querying the thread ID for user
def db_query_user_thread(user_name):
    # Initialize a new session
    session = sessionLocal()

    # Query table    
    result = session.query(__user_thread).filter_by(UserName=user_name).order_by(__user_thread.c.CreatedAt.desc()).first()

    # 1. Check if result is not none
    if result:
        # If last accessed at is none, check against created time
        if result.LastAccessedAt is None:
            if (datetime.now() - result.CreatedAt) <= timedelta(minutes=int(os.getenv('THREAD_LIFE'))):
                # Update LastAccessedAt
                update_stmt = update(__user_thread).where(__user_thread.c.Id==result.Id).values(LastAccessedAt=datetime.now())
                session.execute(update_stmt)
                session.commit()
                logging.info('Thread ID record updated (LastAccessed was None)')
                return result.ThreadId
        else:
            # Check if last accessed at is within the time frame
            if (datetime.now() - result.LastAccessedAt) <= timedelta(minutes=int(os.getenv('THREAD_LIFE'))):
                # Update LastAccessedAt
                update_stmt = update(__user_thread).where(__user_thread.c.Id==result.Id).values(LastAccessedAt=datetime.now())
                session.execute(update_stmt)
                session.commit()
                logging.info('Thread ID record updated (LastAccessed was not None)')
                return result.ThreadId
    return None
    
# Function to insert the thread ID for given User
def db_insert_user_thread(user_name, thread_id, title):
    # Initialize a new session
    session = sessionLocal()

    # Insert the value
    user_thread_entry = {"Id":str(uuid.uuid4()),
                    "UserName":user_name,
                    "ThreadId":thread_id,
                    "ThreadTitle": title,
                    "CreatedAt":datetime.now()}
    session.execute(insert(__user_thread).values(user_thread_entry))
    logging.info("Thread created and inserted in Database")
    session.commit()

# Function to get all threadIds for given user
def db_query_threads(user_name):
    # Initialize a new session
    session = sessionLocal()

    # Query Database
    thread_data = session.query(__user_thread).filter_by(UserName=user_name).order_by(__user_thread.c.CreatedAt.desc()).all()

    if thread_data:
        thread_id_list = []
        for thread in thread_data:
            thread_id_list.append({thread.ThreadTitle: thread.ThreadId})
        return thread_id_list
    return None

# Function to edi the Thread Title in DB
def db_edit_thread_title(thread_id, new_title):
    # Initialize a new session
    session = sessionLocal()

    # Query Database
    result = session.query(__user_thread).filter_by(ThreadId=thread_id).first()

    if result:
        # Update ThreadTitle
        update_stmt = update(__user_thread).where(__user_thread.c.ThreadId==thread_id).values(ThreadTitle=new_title)
        session.execute(update_stmt)
        session.commit()
        logging.info('Thread Title updated')
        return True
    return False

# Function to add Feedback to a Thread in DB
def db_edit_thread_feedback(thread_id, feeback):
    # Initialize a new session
    session = sessionLocal()

    # Query Database
    result = session.query(__user_thread).filter_by(ThreadId=thread_id).first()

    if result:
        # Update Feedback
        update_stmt = update(__user_thread).where(__user_thread.c.ThreadId==thread_id).values(Feedback=feeback)
        session.execute(update_stmt)
        session.commit()
        logging.info('Feedback updated')
        return True
    return False

# Function to delete thread from DB
def db_delete_chat(thread_id):
    # Initialize a new session
    session = sessionLocal()

    try:
        delete_stmt = delete(__user_thread).where(__user_thread.c.ThreadId==thread_id)
        session.execute(delete_stmt)
        session.commit()
        logging.info('Thread deleted')
        return True
    except Exception as e:
        logging.error(f"Error deleting thread: {e}")
        return False
    
# Function for Querying User Role and Personalized Questions
def db_query_user_role_and_questions(user_name):
    # Initialize a new session
    session = sessionLocal()
    
    # Grt prompts for Leaves and HR Guidelines
    hr_gl_prompt = os.getenv('HR_GL_PROMPT')
    leave_prompt = os.getenv('LEAVE_PROMPT')
        
    result = session.query(__employee_table).filter_by(EmpName=user_name).first()
    if result:
        return {"Prompt1" : result.Prompt1,
                    "Prompt2" : result.Prompt2,
                    "Description1" : result.Descp1,
                    "Description2" : result.Descp2,
                    "Question1" : result.Question1,
                    "Question2" : result.Question2,
                    "HrGlPrompt": hr_gl_prompt,
                    "LeavePrompt" : leave_prompt}
    return None

# Function to get user name   
@app.route('/get-username', methods=['GET'])
def get_username():
    try:
        username = get_user_name()
        return jsonify({'username': username})
    except Exception as e:
        return jsonify({'error': str(e)}), 400 

# Function to retrieve all message from all threads for a user
@app.route('/chat-history', methods=['GET'])
def retrieve_chat_history():

    # get the user_name
    user_name = get_user_name()

    # Get all threads for the given user
    chat_history = db_query_threads(user_name)
    return jsonify(chat_history)

# Function to retrieve all the messages for the given thread
@app.route('/chat-history-thread', methods=['GET', 'POST'])
def retrieve_chat_history_for_thread():
    data = request.get_json()
    thread_id = data.get('thread_id', '')

    if not thread_id:
        return jsonify({"Error" : "No thread ID provided"})
    
    messages = client.beta.threads.messages.list(thread_id=thread_id)
    # Extract Required things from the messages
    extracted_messages = []
    for message in messages:
        content = message.content[0].text.value if message.content and message.content[0].text else ""
        content = clean_response(content)
        if (message.role == 'user'):
            pattern = r'(?:"User Name"|User Name):'
            content = re.split(pattern, content)[0]
        extracted_messages.append({"role" : message.role,
                                "content" : content,
                                "created_at" : message.created_at})
    extracted_messages.reverse()
    return jsonify(extracted_messages)

# Function to edit the chat title
@app.route('/edit-chat-title', methods=['POST'])
def edit_chat_title():
    data = request.get_json()
    thread_id = data.get('threadId', None)
    title =  data.get('title', None)

    if not thread_id or not title:
        return jsonify({"Error" : "No thread ID/ Title provided"})
    
    resp = db_edit_thread_title(thread_id=thread_id, new_title=title)
    if resp:
        return jsonify({"Success" : "Chat title updated successfully"})
    else:
        return jsonify("Failure: Chat title update failed")
    
# Function to edit the chat title
@app.route('/add-feedback', methods=['POST'])
def add_feedback():
    data = request.get_json()
    thread_id = data.get('threadId', None)
    quick = data.get('quick', '')
    quick if quick != null else ''
    sufficient = data.get('sufficient', '')
    sufficient if sufficient != null else ''
    additional = data.get('additional', '')
    time = data.get('time', '')
    feedback = f'{time}: Quick? {quick}, Sufficient? {sufficient}, Additional Text: {additional}'

    if not thread_id:
        return jsonify({"Error" : "No thread ID provided"})
    
    resp = db_edit_thread_feedback(thread_id=thread_id, feeback=feedback)
    if resp:
        return jsonify({"Success" : "Chat feedback updated successfully"})
    else:
        return jsonify("Failure: Chat feedback update failed")
    
# Function to delete the chat element
@app.route('/delete-chat', methods=['POST'])
def delete_chat():
    data = request.get_json()
    thread_id = data.get('threadId', None)

    if not thread_id:
        return jsonify({"Error" : "No thread ID provided"})
    
    resp = db_delete_chat(thread_id=thread_id)
    if resp:
        return jsonify({"Success" : "Chat deleted successfully"})
    else:
        return jsonify("Failure: Chat delete failed")
    
# Functin to get the Personlized Prompts
@app.route('/get-initial-hr-prompts', methods=['GET'])
def get_initial_prompts():
    # get the user_name
    user_name = get_user_name()

    results = db_query_user_role_and_questions(user_name=user_name)
    if results:
        return jsonify(results)
    return jsonify({"error": "No data found"}), 404

# Function for main logic   
@app.route('/analyse-hr', methods=['POST'])
def analyse_hr() -> Response:
    data = request.get_json()
    prompt = data.get('prompt', '')
    thread_id = data.get('threadId', None)

    logging.info(f"Thread ID from request: {thread_id}")

    # If no thread found
    if thread_id is None or thread_id == 'New':
        # Create a thread and store against the user_name
        thread_id = client.beta.threads.create().id
        logging.info(f"Thread ID generated: {thread_id}")

    # Add a user question to the thread
    message = client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=prompt
    )

    logging.info(f"Message: {message}")

    # Create Run
    run = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=os.getenv('ASSISTANT_ID_HR')
    )

    # Looping until the run completes or fails
    while run.status in ['queued', 'in_progress', 'cancelling']:
        time.sleep(1)
        run = client.beta.threads.runs.retrieve(
            thread_id=thread_id,
            run_id=run.id
        )
    if run.status == 'completed':
        messages = client.beta.threads.messages.list(
            thread_id=thread_id
        )
        llm_response, file_id = process_messages(messages)
        response_text = clean_response(llm_response)
        logging.info(f"RESPONSE FROM ANALYZE HR PROCUREMENT= {response_text}")
        if file_id != "":
            response_file = client.files.retrieve(file_id=file_id).filename
        else:
            response_file = ""
        return make_response(response_text=response_text, response_file=response_file)
    else:
        return make_response(response_text="Error with AI-Assistant run")
    
def process_messages(messages):
    """
    Extracts and returns message content from SyncCursorPage[Message].
    """
    for message in messages:
        if type(message.content[0]) == TextContentBlock:
            if(message.role=='assistant'):
                if(message.content[0].text.annotations != []):
                    return message.content[0].text.value, message.content[0].text.annotations[0].file_citation.file_id
                else:
                    return message.content[0].text.value, ""
    return "Error with AI-Assistant message", ""

def clean_response(response_text: str) -> str:
    """
    Removes the ai generated sources of the vector store
    """
    return re.sub(r'【.*?】', '', response_text)

def make_response(response_text: str, response_file: str = "") -> Response:
    return jsonify(
        {
            "response_text": response_text,
            "response_file": response_file
        }
    )

### End of Functions for HR-Demo

@app.route('/')
def index():
    #user = session.get("user")
    #if not user:
    #    return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/capabilities')
def capabilities():
    return render_template('capabilities.html')

@app.route('/use-cases')
def use_cases():
    return render_template('use-cases.html')

@app.route('/multimodal')
def multimodal():
    return render_template('multimodal.html')

@app.route('/virtual-assistant')
def virtual_assistant():
    return render_template('use-cases/hr-chatbot.html')

@app.route('/use-cases/<component>')
def use_cases_components(component):
    session.clear()
    clear_cache()
    if component == "contracts-procurement":
        return render_template('use-cases/contracts-procurement.html')
    else:
        return "Component not found", 404

@app.route('/capabilities/<component>')
def capabilities_page(component):
    session.clear()
    clear_cache()
    if component == "multimodal":
        return render_template('capabilities/multimodalchat.html')
    elif component == "guardrails":
        return render_template('capabilities/guardrails.html')
    elif component == "knowledgegraph":
        return render_template('capabilities/knowledge_graph.html')
    elif component == "charts":
        return redirect(url_for('charts'))
    else:
        return "Component not found", 404

@app.route('/capabilities/charts', methods=['GET', 'POST'])
def charts():
    print("I AM IN /CHART")
    if request.method == 'POST':
        prompt = request.form['prompt']
        result = service.chat_with_gpt(prompt)

        text = result.get("text", "")
        table = result.get("table", None)
        chart_html = result.get("chart_html", None)

        return render_template(
            'capabilities/charts.html', 
            text=text, 
            table=table, 
            chart_html=chart_html
        )

    return render_template('capabilities/charts.html')

@app.route('/download_chart', methods=['GET'])
def download_chart():
    chart_image_path = "static/chart_image.png"
    return send_file(chart_image_path, mimetype='image/png', as_attachment=True)

@app.route('/detect-language', methods=['POST'])
def detect_language():
    data = request.json
    text = data.get('text', '')

    if not text:
        return jsonify({"error": "No text provided"}), 400

    detected_language = detect_language_service.detect_language(text)
    return jsonify({"language": detected_language})

# Load prompt configuration from a JSON file
def load_prompt_config():
    with open('config/prompts_config.json', 'r') as file:
        return json.load(file)
    
@app.route('/api/prompts', methods=['GET'])
def get_prompts():
    config = load_prompt_config()
    return jsonify(config['prompt_buttons'])

# API to get recommended prompts based on a result (OpenAI + manual prompts)
@app.route('/api/recommended-prompts', methods=['POST'])
def get_recommended_prompts():
    result_text = request.json.get('result')
    if(result_text == None):
        return jsonify([])
    config = load_prompt_config()
    print(f"RESULT TEXT = {result_text}")
    # Manually defined recommended prompts
    recommended = []
    for condition in config['recommended_prompts']['results_based']:
        if condition['result_contains'].lower() in result_text.lower():
            recommended = condition['prompts']
            break

    # OpenAI-generated follow-on prompts through LLMService
    llm_recommended_prompts = llm_service.generate_follow_on_prompts(result_text)

    # Add manual and most requested prompts
    recommended += config['recommended_prompts']['manual_prompts']
    recommended += config['recommended_prompts']['most_requested_prompts']
    
    # Combine with OpenAI follow-on prompts
    recommended += llm_recommended_prompts

    return jsonify(recommended)

@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    text_to_translate = data.get('text', 'Welcome to my house')
    target_language = data.get('target_language', 'ar-SA')

    translated_text = translate_service.translate_text(text_to_translate, target_language)
    return jsonify({'translated_text': translated_text})

@app.route('/speak', methods=['POST'])
def speak_text():
    data = request.json
    text = data.get('text')
    language = data.get('language', 'en-US')

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        text_to_speech_service.speak_text(text, language)
        return jsonify({"message": "Text is being spoken"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# File-saving logic (I/O bound)
def save_file(file, upload_folder):
    filename = secure_filename(file.filename)
    file_path = os.path.join(upload_folder, filename)
    file.save(file_path)
    return filename, file_path

# LLM processing (CPU-bound)
def process_file(file_path, filename):
    file_ext = filename.split(".")[-1].lower()

    file_cache_key = f"file:{filename}"
    if file_ext in  ['png', 'jpg', 'jpeg', 'gif']:
        sas_url = upload_file_to_azure(file_path, filename)
        #response = face_service.recognize_faces(file_path)
        # celebrity_info = extract_celebrity_info(response)
        content = process_image(sas_url,None)
        content += "\nImage URL: {}".format(sas_url)
    elif file_ext in ['pdf', 'docx', 'txt']:
        content = extract_text(file_path)
    elif file_ext in ['mp4', 'avi', 'mov']:
        content = process_video(file_path, "")
    elif file_ext in ['wav', 'mp3']:
        content = process_audio(file_path)

    redis_client.set(file_cache_key, content)  # Save extracted text in Redis
    
    total_tokens = count_tokens(content + "\n Extract key points from this document")
    max_tokens = config['max_content_tokens']
    # Ensure the context does not exceed max tokens, chunk if needed
    if file_ext in  ['png', 'jpg', 'jpeg', 'gif']:
        key_points = content
    else:
        if total_tokens > max_tokens:
            key_points = chunk_text_with_batching(content, max_tokens // 2)
        else:
            key_points = llm_service.analyze_text_key_points(content, "Extract key points from this document")

    key_points_cache_key = f"key_points:{filename}"
    redis_client.set(key_points_cache_key, key_points)  # Store key points in Redis

    return filename

def process_audio(file_path):
    transcription = audio_service.transcribe_audio(file_path)
    return transcription

def process_video(file_path, prompt):
    video_summary = video_service.process_video(file_path, prompt)
    return video_summary

def process_image(file_path,celebs_info):
    description = image_service.describe_image(file_path,celebs_info)
    return description

def extract_celebrity_info(response):
    celebrity_info = []
    for celebrity in response.get('CelebrityFaces', []):
        name = celebrity['Name']
        emotions = celebrity['Face']['Emotions']
        # Extract the most dominant emotion based on confidence
        sorted_emotions = sorted(emotions, key=lambda x: x['Confidence'], reverse=True)
        dominant_emotion = sorted_emotions[0]['Type']
        emotion_description = ', '.join([f"{emotion['Type']} ({emotion['Confidence']:.1f}%)" for emotion in emotions])
        
        # Prepare the information
        celebrity_info.append({
            'Name': name,
            'DominantEmotion': dominant_emotion,
            'EmotionDescription': emotion_description
        })
    return celebrity_info

@app.route('/upload_new', methods=['POST'])
def upload_files_new():
    session.clear()
    clear_cache()
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files part in the request'}), 400

    files = request.files.getlist('files[]')

    if not files:
        return jsonify({'error': 'No files selected'}), 400

    uploaded_filenames = []

    # Step 1: Use ThreadPoolExecutor to save files concurrently (I/O-bound)
    try:
        with ThreadPoolExecutor() as executor:
            futures = [executor.submit(save_file, file, config['upload_folder']) for file in files]
            saved_files = [future.result() for future in futures]
    except Exception as e:
        return jsonify({
            'message': f'Error in step 1: {e}',
            'filenames': []
        }), 500

    # Step 2: Use ThreadPoolExecutor to process files concurrently (CPU-bound)
    try:
        with ThreadPoolExecutor() as executor:
            futures = [executor.submit(process_file, file_path, filename) for filename, file_path in saved_files]
            for future in futures:
                uploaded_filenames.append(future.result())
    except Exception as e:
        return jsonify({
            'message': f'Error in step 2: {e}',
            'filenames': []
        }), 500

    session['uploaded_filenames'] = uploaded_filenames

    return jsonify({
        'message': 'Files successfully uploaded and key points extracted.',
        'filenames': uploaded_filenames
    }), 200


@app.route('/analyze_new', methods=['POST'])
def analyze_prompt_new():
    data = request.get_json()
    prompt = data.get('prompt', '')
    print(f"PROMPT = {prompt}")
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    # Retrieve key points from Redis
    uploaded_filenames = session.get('uploaded_filenames', [])
    key_points_list = []

    for filename in uploaded_filenames:
        key_points_cache_key = f"key_points:{filename}"
        key_points = redis_client.get(key_points_cache_key)
        if key_points:
            key_points_list.append(f"Key points from file {filename}: {key_points.decode('utf-8')}")

    # Combine key points for context
    combined_key_points = "\n".join(key_points_list)

    # Retrieve conversation history from Redis (only last 5 interactions)
    conversation_history_key = f"conversation_history_1"
    conversation_history = redis_client.lrange(conversation_history_key, 0, -1)

    # Convert history to a single string
    history_context = "\n".join([entry.decode('utf-8') for entry in conversation_history])
    
    # Combine history, key points, and current prompt
    total_context = f"{history_context}\n{combined_key_points}\nUser: {prompt}"

    # Calculate tokens
    total_tokens = count_tokens(total_context)
    max_tokens = config['max_content_tokens']

    # Ensure the context does not exceed max tokens, chunk if needed
    if total_tokens > max_tokens:
        total_context = chunk_text_with_batching(total_context, max_tokens // 2)
    print("Just before analyze content in app.py")
    # Send the concise context and new prompt to OpenAI
    llm_response = llm_service.analyze_content(total_context, prompt)
    print(f"Just after analyze content in app.py = {llm_response}")

    # Save the new prompt and response to Redis as conversation history
    redis_client.rpush(conversation_history_key, f"User: {prompt}")
    redis_client.rpush(conversation_history_key, f"Assistant: {llm_response}")

    # Trim history to only keep the last 5 interactions (10 entries)
    redis_client.ltrim(conversation_history_key, -3, -1)

    # Return the new response
    response = prepare_response_data(text_results=llm_response, image_results=[])
    print(f"RESPONSE FROM ANALYZE NEW = {response}")
    return response

def prepare_response_data(image_results, text_results):
    if not image_results:
        image_results = []

    if image_results:
        image_results = [{"image_data": img["url"], "description": img.get("description", "No description")} for img in image_results]

    response_data = {
        "image_results": image_results,
        "text_results": text_results
    }
    return jsonify(response_data)

@app.route('/save-topics', methods=['POST'])
def save_topics():
    data = request.get_json()
    user_role = data.get('userRole')
    valid_topics = data.get('validTopics')
    invalid_topics = data.get('invalidTopics')

    # Serialize the lists into JSON strings and save them in Redis
    redis_client.set(f'{user_role}_valid_topics', json.dumps(valid_topics))
    redis_client.set(f'{user_role}_invalid_topics', json.dumps(invalid_topics))
    
        # Save the user role in Redis
    redis_client.set('current_user_role', user_role)


    return jsonify({'success': True})

@app.route('/get-saved-topics', methods=['POST'])
def get_saved_topics():
    data = request.get_json()
    user_role = data.get('userRole')

    # Retrieve the topics from Redis
    valid_topics_json = redis_client.get(f'{user_role}_valid_topics')
    invalid_topics_json = redis_client.get(f'{user_role}_invalid_topics')

    # Deserialize the JSON strings back into Python lists
    valid_topics = json.loads(valid_topics_json) if valid_topics_json else []
    invalid_topics = json.loads(invalid_topics_json) if invalid_topics_json else []

    return jsonify({'validTopics': valid_topics, 'invalidTopics': invalid_topics})

@app.route('/delete-topic', methods=['POST'])
def delete_topic():
    data = request.get_json()
    user_role = data.get('userRole')
    topic = data.get('topic')
    topic_type = data.get('topicType')  # 'valid' or 'invalid'

    if topic_type == 'valid':
        topics_key = f'{user_role}_valid_topics'
    else:
        topics_key = f'{user_role}_invalid_topics'

    # Get the current topics list from Redis
    topics_json = redis_client.get(topics_key)
    topics = json.loads(topics_json) if topics_json else []

    # Remove the topic
    if topic in topics:
        topics.remove(topic)

    # Save the updated list back to Redis
    redis_client.set(topics_key, json.dumps(topics))

    return jsonify({'success': True})

def clear_cache():
    # Save valid and invalid topics for both technical and non-technical roles
    technical_valid_topics = redis_client.get('technical_valid_topics')
    technical_invalid_topics = redis_client.get('technical_invalid_topics')
    non_technical_valid_topics = redis_client.get('non-technical_valid_topics')
    non_technical_invalid_topics = redis_client.get('non-technical_invalid_topics')
    
    # Save the current user role
    current_user_role = redis_client.get('current_user_role')

    # Flush all data
    redis_client.flushdb()

    # Restore the valid and invalid topics
    if technical_valid_topics:
        redis_client.set('technical_valid_topics', technical_valid_topics)
    if technical_invalid_topics:
        redis_client.set('technical_invalid_topics', technical_invalid_topics)
    if non_technical_valid_topics:
        redis_client.set('non-technical_valid_topics', non_technical_valid_topics)
    if non_technical_invalid_topics:
        redis_client.set('non-technical_invalid_topics', non_technical_invalid_topics)

    # Restore the current user role
    if current_user_role:
        redis_client.set('current_user_role', current_user_role)

    return jsonify({"message": "Cache cleared, except for valid/invalid topics and user role."}), 200

# Function to handle the RestrictToTopic validator
def create_guard(valid_topics, invalid_topics):
    device = -1  # Using CPU, modify if you want to use a GPU
    
    # If no valid topics are provided, set a broader default valid topic
    if not valid_topics or len(valid_topics) == 0:
        valid_topics = ["general", "conversation", "open-discussion", "anything"]  # Use broader default valid topics
        print("[DEBUG] No valid topics provided, setting to default: ['general', 'conversation', 'open-discussion']")

    print(f"[DEBUG] Valid topics: {valid_topics}")
    print(f"[DEBUG] Invalid topics: {invalid_topics}")
    os.environ['OPENAI_API_KEY'] = secrets['openai_api_key']  # Set environment variable for OpenAI

    return Guard.from_string(
        validators=[
            TopicValidatorWithLLM(
                valid_topics=valid_topics,
                invalid_topics=invalid_topics,
                model="gpt-4o",
                on_fail="reask",
            )
        ],
    )

@app.route("/query", methods=["POST"])
def query():
    data = request.json
    user_input = data['input']
    valid_topics = data['validTopics']
    invalid_topics = data['invalidTopics']

    print(f"[DEBUG] Received user input: {user_input}")
    print(f"[DEBUG] Received valid topics from frontend: {valid_topics}")
    print(f"[DEBUG] Received invalid topics from frontend: {invalid_topics}")
    
    """
    if valid_topics or invalid_topics:

        guard = create_guard(valid_topics, invalid_topics)

        # Validate the input using RestrictToTopic
        try:
            print("[DEBUG] Starting validation with RestrictToTopic validator")
            user_input = guard.parse(llm_output=user_input).validated_output
            print("[DEBUG] Validation passed")
        except ValidationError as e:
            print(f"[DEBUG] Validation error occurred: {str(e)}")
            return jsonify({"error": f"Content detected does not meet the validation criteria. Please review and try again voilation {e}."}), 400
    """
    # If validation passes, query the LLM
    response = llm_service.guardrails_query_openai(user_input)
   
    if valid_topics or invalid_topics:
        guard = create_guard(valid_topics, invalid_topics)

        # Validate the input using RestrictToTopic
        try:
            print("[DEBUG] Starting validation with RestrictToTopic validator")
            response = guard.validate(llm_output=response).validated_output
            print("[DEBUG] Validation passed")
        except ValidationError as e:
            print(f"[DEBUG] Validation error occurred: {str(e)}")
            return jsonify({"error": f"Content detected does not meet the validation criteria. Please review and try again voilation {e}."}), 400
    
    """
    TODO: 
    - Rigorously test
    - Seperate validation on user input to scrub data they cannot ask for
    - include jail breaking guard rails
    - Dynamic topic notator: a topic label that may be vague when entered can query the user 
    to click on the particular intended interpertation
    - Handle seperate Roles each which have a unique list of valid and invalid topics for fine
    permissions control on access and usage
    """



    return jsonify({"response": response})

def format_graph_result(result):

    for record in result:
        n, r, m = record['n'], record['r'], record['m']
        print(f"RESULT = {n}, {r}, {m}")
    # return f"The graph indicates that '{n['name']}' is related to '{m['name']}' via the relationship '{r['type']}'"
    return result

def preprocess_graph_prompt(prompt):
    # Simple keyword extraction: remove punctuation, convert to lowercase, split by whitespace
    prompt_clean = re.sub(r'[^\w\s]', '', prompt.lower())
    words = prompt_clean.split()
    
    # Frequency analysis to determine key terms (naive approach)
    common_words = Counter(words).most_common()
    
    # Select top-N words as key entities (e.g., top 2)
    key_entities = [word for word, freq in common_words[:2]]
    
    return key_entities

def get_relevant_graph_data(prompt):
    # This function should match entities in the prompt with entities in your graph.
    # You can search for nodes and relationships that are relevant to the prompt text.
    # Example:
    print("I AM IN THE GET RELEVANT FUNCTION")
    print(f"Prompt: {prompt}") 

    key_entities = preprocess_graph_prompt(prompt)
    if len(key_entities) < 2:
        return []

    with driver.session() as session:
        result = list(session.run(  
            """
            MATCH (n)-[r]->(m)
            WHERE n.name CONTAINS $key1 OR m.name CONTAINS $key1
               OR n.name CONTAINS $key2 OR m.name CONTAINS $key2
            RETURN n, r, m
            LIMIT 1500
            """,
            key1=key_entities[0],
            key2=key_entities[1]
        ))

    print(f"Prompt### = {result}")
    return format_graph_result(result)  # Function to format this data appropriately for the prompt

@app.route('/get_graph_data', methods=['GET'])
def get_graph_data():
    nodes = {}
    relationships = []
    edges = []

    with driver.session() as session:
        result = session.run(
            """
            MATCH (n)-[r]->(m)
            RETURN n, r, m
            """
        )

        # Processing nodes and relationships
        for record in result:
            n = record['n']
            m = record['m']
            r = record['r']

            print(f"n = {n}")
            print(f"m = {m}")
            # print(f"r = {r}")

            if n.element_id not in nodes:
                print(f"nid = {n.element_id}")
                nodes[n.element_id] = {
                    'id': n.element_id, 
                    'label': n['name'],
                    'group': list(n.labels)[0] if n.labels else 'Unknown'
                }

            if m.element_id not in nodes:
                print(f"mid = {m.element_id}")
                nodes[m.element_id] = {
                    'id': m.element_id, 
                    'label': m['name'],
                    'group': list(m.labels)[0] if m.labels else 'Unknown'
                }

            # Add relationships to the relationships list
            # print(f"r = {r}")
            relationships.append(r)

        for r in relationships:
            if r.start_node.element_id in nodes and r.end_node.element_id in nodes:
                edge = {
                    'from': nodes[r.start_node.element_id]['id'],
                    'to': nodes[r.end_node.element_id]['id'],
                    'label': r.type
                }
                edges.append(edge)
                print(f"Edge = {edge}")
            else: 
                print(f"Warning: Node {r.start_node.element_id} or {r.end_node.element_id} not found in nodes.")   

        return jsonify({"nodes": list(nodes.values()), "edges": edges})

@app.route('/run_prompt', methods=['POST'])
def run_prompt():
    prompt = request.json.get('prompt')

    relevant_graph_data = get_relevant_graph_data(prompt)  # This function should extract relevant info
    enhanced_prompt = f"{relevant_graph_data} {prompt}"    

    print(f"Final prompt to LLM: {enhanced_prompt}")

    # Use OpenAI to generate a response based on the prompt and the graph data
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": "You are a helpful assistant that provides detailed analysis."},
                  {"role": "user", "content": enhanced_prompt}],
        max_tokens=4000,
        temperature=0.5,
        timeout=60  # Increase timeout to 60 seconds or more
    )

    result = response.choices[0].message.content.strip()
    return jsonify(result=result)

@app.route('/run_prompt_without_kg', methods=['POST'])
def run_prompt_without_kg():
    prompt = request.json.get('prompt')

    # relevant_graph_data = get_relevant_graph_data(prompt)  # This function should extract relevant info
    enhanced_prompt = f"{prompt}"    

    print(f"Final prompt to LLM: {enhanced_prompt}")

    # Use OpenAI to generate a response based on the prompt and the graph data
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": "You are a helpful assistant that provides detailed analysis."},
                  {"role": "user", "content": enhanced_prompt}],
        max_tokens=4000,
        temperature=0.5,
        timeout=60  # Increase timeout to 60 seconds or more
    )

    result = response.choices[0].message.content.strip()
    return jsonify(result=result)


if __name__ == '__main__':
    # app.run(host='localhost', port=8000, ssl_context=('cert.pem', 'key.pem'))
    app.run(host='127.0.0.1', port=5000, ssl_context=('cert.pem', 'key.pem'))
