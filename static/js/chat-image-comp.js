const azureSpeechKey = '43fc3c57232c449d9229448e12bbb1db';
const azureSpeechRegion = 'westeurope';
const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(azureSpeechKey, azureSpeechRegion);
// Elements selection
const promptTextarea = document.getElementById('promptTextarea');
const fileInput = document.querySelector('#fileInput');
const fileContainer = document.querySelector('#fileContainer');
const chatBoxContainer = document.querySelector('#chatBox');
const promptBtn = document.querySelector('.send-icon-wrapper');
const micButton = document.querySelector('#mic');
const stopMicButton = document.querySelector('#stopMic');
const chatLang = document.getElementById('chatLang');
const fileUploadButton = document.querySelector('#fileUpload');


let filesQueriesContainer;
let selectedLanguagePrompt = "en-US";
let uploadedFiles = [];
let isSpeaking = false;
let audio = null;   
let synthesizer = null;
let player = null;


// Supported file types and icons
const fileIcons = {
  'pdf': '../../static/images/upload_pdf.png',
  'docx': '../../static/images/upload_docx.png',
  'mp4': '../../static/images/upload_mp4.png',
  'jpeg': '../../static/images/upload_jpeg.png',
  'png': '../../static/images/upload_png.png',
  'txt': '../../static/images/upload_txt.png',
  'gif': '../../static/images/upload_gif.png',
  'jpg': '../../static/images/upload_jpg.png'
};

// Placeholder text for different languages
const placeholders = {
  'en-US': 'Type your message here...',
  'ar-SA': 'اكتب رسالتك هنا...',
  'zh-CN': '在这里输入你的信息...',
  'es-MX': 'Escribe tu mensaje aquí...',
  'fr-FR': 'Tapez votre message ici...',
  'de-DE': 'Geben Sie hier Ihre Nachricht ein...',
  'ru-RU': 'Введите ваше сообщение здесь...',
  'pt-BR': 'Digite sua mensagem aqui...',
  'hi-IN': 'अपना संदेश यहाँ टाइप करें...',
  'ja-JP': 'ここにメッセージを入力してください...',
  'ko-KR': '여기에 메시지를 입력하세요...',
  'it-IT': 'Scrivi il tuo messaggio qui...'
};

// Initialization functions
function initialize() {
  setPromptTextareaWidth();
  checkContent();
}

function hidePreviewScreen() {
  const previewScreen = document.querySelector('.preview-screen');
  if (previewScreen) {
    previewScreen.classList.add('d-none');
  }
}

// Set prompt textarea width
function setPromptTextareaWidth() {
  const getWidth = promptTextarea.clientWidth;
  promptTextarea.style.width = `${getWidth}px`;
}

// Check content in prompt textarea
function checkContent() {
  if (promptTextarea.textContent.trim() !== '') {
    promptTextarea.classList.add('focusing');
    promptBtn.classList.remove('fade');
  } else {
    promptTextarea.classList.remove('focusing');
    promptBtn.classList.add('fade');
  }
}

// Show files selected for upload
function filesShow() {
  if (fileInput.files.length > 0) {
    const filesArray = Array.from(fileInput.files);

    const filesElement = filesArray.map(file => {
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();
      const iconSrc = fileIcons[fileExtension];
      const fileFormat = fileExtension.toUpperCase();

      return `
        <div class="uploaded-file d-flex align-items-center mb-2 gap-2">
          <div class="img-wrapper position-relative">
            <div class="loader d-none" id="file-upload-loader"></div>
            <img src="${iconSrc}" alt="${fileFormat} icon">
          </div>
          <div class="file-meta overflow-x-hidden">
            <p class="file-name">${fileName}</p>
            <p class="file-format text-darkgrey fw-medium">${fileFormat}</p>
          </div>
        </div>`;
    }).join('');

    fileContainer.innerHTML += filesElement;
    filesQueriesContainer = filesElement;
    toggleFileLoaders(false);
    uploadFiles();
  }
}

// Upload files to server
function uploadFiles() {
  const formData = new FormData();
  Array.from(fileInput.files).forEach(file => {
    console.log('File selected:', file.name, file.size, file.type);
    formData.append('files[]', file);
  });

  fetch('/upload_new', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    console.log('success:', data);
    uploadedFiles = data.filenames
    toggleFileLoaders(true);
  })
  .catch(error => {
    console.error('Error uploading files:', error);
  });
}

// Toggle file loaders visibility
function toggleFileLoaders(hide) {
  const fileLoaders = fileContainer.querySelectorAll('#file-upload-loader');
  fileLoaders.forEach(loader => {
    loader.classList.toggle('d-none', hide);
  });
}

// Function to initialize the Speech SDK with the selected language
function initializeSpeechSDK(languageCode) {
  player = new SpeechSDK.SpeakerAudioDestination();
  var audioConfig  = SpeechSDK.AudioConfig.fromSpeakerOutput(player);
  speechConfig.speechSynthesisLanguage = languageCode;
  synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
}

// Function to speak text using Azure Speech SDK
function speakText(resultText, selectedLanguage) {
  if (player) {
    player.resume();
    return;
   }
  if (!resultText) {
    console.error('Text not available.');
    return;
  }

  // Initialize the synthesizer with the selected language
  initializeSpeechSDK(selectedLanguage);
  // Start speaking the text
  synthesizer.speakTextAsync(
    resultText,
    function (result) {
      if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
        console.log('Speech synthesis completed.');
      } else {
        console.error('Speech synthesis failed:', result.errorDetails);
      }
      isSpeaking = false;
      synthesizer.close();  // Dispose of the synthesizer after speaking
      player= null;
      synthesizer = null;
    },
    function (error) {
      console.error('Error during speech synthesis:', error);
      isSpeaking = false;
      synthesizer.close();  // Dispose of the synthesizer on error
      player= null;
      synthesizer = null;
    }
  );
  isSpeaking = true;
}

// Function to stop speaking
function stopSpeak() {
  if (player) {
   player.pause();
   synthesizer.close();
   player= null;
  }
}

function addSpeakListeners() {
  document.querySelectorAll('#speak').forEach((speakButton) => {
    speakButton.addEventListener('click', function () {
      const parentDiv = speakButton.closest('div');
      const stopSpeakButton = parentDiv.querySelector('#stopSpeak');
      const text_results = parentDiv.parentElement.parentElement.querySelector('#query-result').innerText
      speakText(text_results,selectedLanguagePrompt)
      speakButton.classList.toggle('d-none');
      stopSpeakButton.classList.toggle('d-none');
    });
  });

  document.querySelectorAll('#stopSpeak').forEach((stopSpeakButton) => {
    stopSpeakButton.addEventListener('click', function () {
      const parentDiv = stopSpeakButton.closest('div');
      const speakButton = parentDiv.querySelector('#speak');
      stopSpeak();
      stopSpeakButton.classList.toggle('d-none');
      speakButton.classList.toggle('d-none');
    });
  });
}

async function translateText(text, targetLanguage) {
  try {
    const response = await fetch('/translate', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          text: text,
          target_language: targetLanguage  // Changed to match Python
      })
    });
    const data = await response.json();
    addResponse(data.translated_text, targetLanguage)
  } catch (error) {
      console.error("Translation Error:", error);
      return text; // Return original text if translation fails
  }
}

function addChangeLanguageListeners() {
  document.querySelectorAll('#responseLang').forEach((change_language) => {
    change_language.addEventListener('change', async function () {
      const targetLanguage = change_language.value;
      const parentDiv = change_language.closest('div');
      const textResults = parentDiv.parentElement.parentElement.querySelector('#query-result').innerHTML; // Extracting text from the desired element
      
      await translateText(textResults, targetLanguage);
    });
  });
}

function checkDirection(language){
  if (language === 'ar-SA') {
    return 'rtl';
  } else {
    return 'ltr';
  }
}

function addResponse(result, language){
  const converter = new showdown.Converter({
    tables: true, // Enable support for Markdown tables
    simplifiedAutoLink: true, // Convert URLs to anchor tags automatically
    simpleLineBreaks: true, // Treat single line breaks as <br> tags
    strikethrough: true, // Enable support for strikethrough syntax
    tasklists: true // Enable support for task lists (checkboxes)
  });

  // Convert Markdown to HTML using Showdown
  const htmlResult = converter.makeHtml(result);
  // Remove any unwanted meta tags (if needed)
  const sanitizedResult = htmlResult.replace(/<meta[^>]+charset="UTF-8"[^>]*>/g, '');

  const responseMessage = `
    <div class="response-wrapper d-flex flex-row gap-2" dir="${checkDirection(language)}">
      <div class="user-account-img">
        <img src="../../static/images/PlanBLogo.jpeg">
      </div>
      <div id="response">
        <div id ="query-result">${sanitizedResult}</div>
        <div class="additional-options mt-3 d-flex align-items-center gap-2">
          <div class="btns-wrapper d-inline-flex align-items-center">
            <button class="btn py-0 ps-0" id="speak">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="speak-icon">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M11 4.9099C11 4.47485 10.4828 4.24734 10.1621 4.54132L6.67572 7.7372C6.49129 7.90626 6.25019 8.00005 6 8.00005H4C3.44772 8.00005 3 8.44776 3 9.00005V15C3 15.5523 3.44772 16 4 16H6C6.25019 16 6.49129 16.0938 6.67572 16.2629L10.1621 19.4588C10.4828 19.7527 11 19.5252 11 19.0902V4.9099ZM8.81069 3.06701C10.4142 1.59714 13 2.73463 13 4.9099V19.0902C13 21.2655 10.4142 22.403 8.81069 20.9331L5.61102 18H4C2.34315 18 1 16.6569 1 15V9.00005C1 7.34319 2.34315 6.00005 4 6.00005H5.61102L8.81069 3.06701ZM20.3166 6.35665C20.8019 6.09313 21.409 6.27296 21.6725 6.75833C22.5191 8.3176 22.9996 10.1042 22.9996 12.0001C22.9996 13.8507 22.5418 15.5974 21.7323 17.1302C21.4744 17.6185 20.8695 17.8054 20.3811 17.5475C19.8927 17.2896 19.7059 16.6846 19.9638 16.1962C20.6249 14.9444 20.9996 13.5175 20.9996 12.0001C20.9996 10.4458 20.6064 8.98627 19.9149 7.71262C19.6514 7.22726 19.8312 6.62017 20.3166 6.35665ZM15.7994 7.90049C16.241 7.5688 16.8679 7.65789 17.1995 8.09947C18.0156 9.18593 18.4996 10.5379 18.4996 12.0001C18.4996 13.3127 18.1094 14.5372 17.4385 15.5604C17.1357 16.0222 16.5158 16.1511 16.0539 15.8483C15.5921 15.5455 15.4632 14.9255 15.766 14.4637C16.2298 13.7564 16.4996 12.9113 16.4996 12.0001C16.4996 10.9859 16.1653 10.0526 15.6004 9.30063C15.2687 8.85905 15.3578 8.23218 15.7994 7.90049Z" fill="currentColor"></path>
              </svg>
            </button>
            <button class="btn py-0 ps-0 d-none" id="stopSpeak">
                <span class="material-symbols-rounded" style="font-size: 20px">
                stop_circle
              </span>
            </button>
            <button class="btn py-0 ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="copy-icon">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path>
              </svg>
            </button>
            <button class="btn py-0 pe-0 border-end-0 ">
              <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="none">
                <path d="M479.8-351q-7.2 0-13.5-2.5T455-361L313-503q-11-10.91-10.5-25.45Q303-543 313.52-554q11.48-11 25.98-11t25.5 11l79 80v-306q0-15.3 10.29-25.65Q464.58-816 479.79-816t25.71 10.35Q516-795.3 516-780v306l80-80q10.67-11 25.33-10.5 14.67.5 26.15 11.5Q658-542 658-527.5T647-502L505-361q-5.4 5-11.7 7.5-6.3 2.5-13.5 2.5ZM263.72-192Q234-192 213-213.15T192-264v-36q0-15.3 10.29-25.65Q212.58-336 227.79-336t25.71 10.35Q264-315.3 264-300v36h432v-36q0-15.3 10.29-25.65Q716.58-336 731.79-336t25.71 10.35Q768-315.3 768-300v36q0 29.7-21.16 50.85Q725.68-192 695.96-192H263.72Z" fill="currentColor"></path>
              </svg>
            </button>
          </div>
          <div class="btns-wrapper d-inline-flex align-items-center gap-1">
            <div class="img-wrapper">
              <img src="../../static/images/language.png" class="w-100 h-100 object-fit-cover" id="flagImage">
            </div>
            <select name="" id="responseLang" class="cursor-pointer bg-transparent border-0 outline-none">
              <option value="en-US">English</option>
              <option value="ar-SA">Arabic</option>
              <option value="zh-CN">Chinese</option>
              <option value="es-MX">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="ru-RU">Russian</option>
              <option value="pt-BR">Portuguese</option>
              <option value="hi-IN">Hindi</option>
              <option value="ja-JP">Japanese</option>
              <option value="ko-KR">Korean</option>
              <option value="it-IT">Italian</option>
            </select>
          </div>
        </div>
      </div>
    </div>`;

  chatBoxContainer.innerHTML += responseMessage;
  const latestResponse = chatBoxContainer.lastElementChild;
  latestResponse.scrollIntoView({ behavior: 'smooth' });
  let allResponses = document.querySelectorAll('#responseLang');
  let latestResponseLang = allResponses[allResponses.length - 1];
  latestResponseLang.value = language;
  addSpeakListeners();
  addChangeLanguageListeners();

}

// Function to handle manual prompt submission
function handleManualPrompt() {
  let promptText = promptTextarea.textContent;
  promptTextarea.value = promptText
  if (promptText.trim() !== "") {
    proccessPrompt();
  } else {
   alert('No prompt entered');
  }
}

// Ensure the Send button triggers prompt submission for manually entered prompts
document.getElementById('sendBtn').onclick = function() {
  handleManualPrompt();
};

//Submit the prompt when the Enter key is pressed in the textarea
document.getElementById('promptTextarea').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleManualPrompt(); 
  }
});

function proccessPrompt() {
  hidePreviewScreen();
  let prompt = promptTextarea.textContent;
  const userMessage = `
    <div class="queries-wrapper d-flex flex-row-reverse gap-2">
      <div class="user-account-img">
        <img src="../../static/images/user.png">
      </div>
      <div id="queries">
        ${fileContainer.children.length > 0 ? `<div class="d-flex flex-row-reverse flex-wrap gap-2">${filesQueriesContainer}</div>` : ''}
        <p dir="${checkDirection(selectedLanguagePrompt)}" class="query-text">${prompt}</p>
      </div>
    </div>`;
  chatBoxContainer.innerHTML += userMessage;

  // Add the placeholder "Analyzing" message
  const placeholderResponse = `
    <div class="response-wrapper d-flex flex-row gap-2" id="analyzingMessage">
      <div class="user-account-img">
        <img src="../../static/images/PlanBLogo.jpeg">
      </div>
      <div id="response">
        <div class="d-flex align-items-end gap-1">
          <p class="fs-14 fw-bold lh-sm">Analyzing</p>
          <div class="responding"></div>
        </div>
      </div>
    </div>`;
  chatBoxContainer.innerHTML += placeholderResponse;

  const latestResponse = chatBoxContainer.lastElementChild;
  latestResponse.scrollIntoView({ behavior: 'smooth' });

  fetch('/analyze_new', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filenames: uploadedFiles,
      prompt: prompt,
      language: selectedLanguagePrompt
    })
  })
  .then(response => response.json())
  .then(async data => {
    // Replace the placeholder with the actual response
    document.getElementById('analyzingMessage').remove(); // Remove the "Analyzing" message
    let textResult = data.text_results;
    addResponse(textResult || 'No result returned.', selectedLanguagePrompt); // Add actual response
  })
  .catch(error => {
    console.error('Error analyzing prompt:', error);
    document.getElementById('analyzingMessage').remove(); // Remove the "Analyzing" message in case of error
    chatBoxContainer.innerHTML += `
      <div class="response-wrapper d-flex flex-row gap-2">
        <div class="user-account-img">
          <img src="../../static/images/PlanBLogo.jpeg">
        </div>
        <div id="response">
          <p>Error analyzing prompt. Please try again later.</p>
        </div>
      </div>`;
  });

  promptTextarea.innerText = '';
  fileContainer.innerHTML = '';
  initialize();
}

async function detectLanguage(text) {
  return fetch('/detect-language', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text })
  })
  .then(response => response.json())
  .then(data => data.language);  // Return the detected language
}

let recognizer
async function startMicStreaming() {
  speechConfig.speechRecognitionLanguage = selectedLanguagePrompt;
  const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
  recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

  // Start the continuous recognition process
  recognizer.startContinuousRecognitionAsync();

  // Handle recognizing events to update partial results in real-time
  recognizer.recognizing = (sender, event) => {
    checkContent();
    console.log('Partial result:', event.result.text);  // Log the partial result for debugging
    promptTextarea.innerText = event.result.text;
  };

  // Handle recognized events for final results
  recognizer.recognized = (sender, event) => {
    console.log('Final result:', event.result.text);  // Log the final result for debugging
    if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
      promptTextarea.innerText = event.result.text;
      recognizer.stopContinuousRecognitionAsync();
      proccessPrompt()
    }
  };

  // Handle any errors during the recognition
  recognizer.canceled = (sender, event) => {
    console.error("Recognition canceled: " + event.errorDetails);
    micButton.classList.toggle('d-none');
    stopMicButton.classList.toggle('d-none');
    recognizer.stopContinuousRecognitionAsync();
  };

  recognizer.sessionStopped = (sender, event) => {
    console.log("Session stopped.");
    micButton.classList.toggle('d-none');
    stopMicButton.classList.toggle('d-none');
    recognizer.stopContinuousRecognitionAsync();
  };
}

function startMicrophone(e) {
  startMicStreaming();
  micButton.classList.toggle('d-none');
  stopMicButton.classList.toggle('d-none');
}


// Change language placeholder and text alignment
function changePlaceholder() {
  selectedLanguagePrompt = chatLang.value;
  promptTextarea.setAttribute('data-placeholder', placeholders[selectedLanguagePrompt]);

  // Check for right-to-left languages
  if (selectedLanguagePrompt === 'ar-SA') {
    promptTextarea.setAttribute('dir', 'rtl');
  } else {
    promptTextarea.setAttribute('dir', 'ltr');
  }
}

// Event listeners
window.addEventListener('resize', setPromptTextareaWidth);
promptTextarea.addEventListener('input', checkContent);
fileInput.addEventListener('change', filesShow);
fileUploadButton.addEventListener('click', () => fileInput.click());
micButton.addEventListener('click', startMicrophone);
chatLang.addEventListener('change', changePlaceholder);

// Initial function call
initialize();