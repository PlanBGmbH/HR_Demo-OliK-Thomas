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


// Function to add copy content listeners with HTML formatting support
function addCopyContentListeners() {
  document.querySelectorAll('#copy-content').forEach(copyButton => {
    copyButton.addEventListener('click', function () {
      const parentDiv = copyButton.closest('div');
      const contentToCopy = parentDiv.parentElement.parentElement.querySelector('#query-result').innerHTML;  // Get the HTML content

      // Use Clipboard API to copy HTML with formatting
      const blob = new Blob([contentToCopy], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });

      navigator.clipboard.write([clipboardItem]).then(function() {
        console.log("HTML content copied to clipboard with formatting!");
      }).catch(function(error) {
        console.error("Error copying HTML content:", error);
      });
    });
  });
}


// Function to add download content listeners using Export2Word
function addDownloadContentListeners() {
  document.querySelectorAll('#download-content').forEach(downloadButton => {
    downloadButton.addEventListener('click', function () {
      const parentDiv = downloadButton.closest('div');
      const queryResult = parentDiv.parentElement.parentElement.querySelector('#query-result').innerHTML;  // Get the element containing the response

      if (queryResult) {
        Export2Word(queryResult);  // Call the export function
      } else {
        console.error('Content to export not found.');
      }
    });
  });
}

// Export2Word function to export the HTML content to Word
function Export2Word(queryResult){

    const QFBase64 = 'data:image/png;base64,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';

    // Construct the HTML content with an image at the top (like a logo or letterhead)
    var preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>
      <img src="${QFBase64}" alt="Letterhead" style="width:100%; max-height:150px;"/><br><br>`;
    var postHtml = "</body></html>";
    var html = preHtml + queryResult + postHtml;

    var blob = new Blob(['\ufeff', html], {
        type: 'application/msword'
    });

    // Specify link url
    var url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);

    // Specify file name
    filename = 'document_' + Math.random().toString(36).substring(2, 15) + '.doc';

    // Create download link element
    var downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);

    if (navigator.msSaveOrOpenBlob) {
        navigator.msSaveOrOpenBlob(blob, filename);
    } else {
        // Create a link to the file
        downloadLink.href = url;

        // Setting the file name
        downloadLink.download = filename;

        // Triggering the download
        downloadLink.click();
    }

    document.body.removeChild(downloadLink);
}


// Call these functions where the content is dynamically added
function addDynamicContentListeners() {
  addSpeakListeners();
  addChangeLanguageListeners();
  addCopyContentListeners();  // Add copy functionality listeners
  addDownloadContentListeners();  // Add download functionality listeners
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
            <button class="btn py-0 " id="copy-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="copy-icon">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path>
              </svg>
            </button>
            <button class="btn py-0 pe-0 border-end-0" id="download-content">
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
  addDynamicContentListeners();
}

function fetchInitialPrompts() {
  fetch('/api/prompts')
      .then(response => {
          if (!response.ok) {
              console.error('Error fetching initial prompts:', response.statusText);
              return;
          }
          return response.json();
      })
      .then(data => {
          displayInitialPrompts(data);
      })
      .catch(error => console.error('Error fetching initial prompts:', error));
}

function displayInitialPrompts(prompts) {
  const initialPromptContainer = document.getElementById('initial-prompts');
  
  // Clear any existing prompt buttons
  initialPromptContainer.innerHTML = '';

  // Loop through the prompts and create buttons for each
  prompts.forEach(prompt => {
      const btn = document.createElement('button');
      btn.className = 'btn initial-prompts btn-primary m-2';
      btn.innerText = prompt.title;
      btn.value = prompt.prompt;
      btn.addEventListener('click', () => {
        buttonPromptClick(prompt.prompt, prompt.title);
      });
      initialPromptContainer.appendChild(btn);
  });
  initialPromptContainer.classList.remove('d-none');
}

fetchInitialPrompts();

function fetchRecommendedPrompts(resultText) {
  fetch('/api/recommended-prompts', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ result: resultText })  // Send result to the backend
  })
  .then(response => {
      if (!response.ok) {
          console.error('Error fetching recommended prompts:', response.statusText);
          return;
      }
      return response.json();
  })
  .then(data => {
      displayRecommendedPrompts(data);  // Display the follow-on prompts
  })
  .catch(error => console.error('Error fetching recommended prompts:', error));
}

function displayRecommendedPrompts(prompts) {
  const recommendedPromptContainer = document.getElementById('recommended-prompts');
  
  // Clear any existing recommended prompt buttons
  recommendedPromptContainer.innerHTML = '';

  // Limit the number of prompts to 3
  const limitedPrompts = prompts.slice(0, 3);

  // Loop through the limited recommended prompts and create buttons for each
  limitedPrompts.forEach(prompt => {
    const btn = document.createElement('button');
    btn.className = 'recomended-prompt btn btn-primary m-2';
    btn.innerText = prompt.title;
    btn.value = prompt.prompt;
    btn.addEventListener('click', () => {
      buttonPromptClick(prompt.prompt, prompt.title);
    });
    recommendedPromptContainer.appendChild(btn);
  });


  // Ensure the recommended prompts are visible
  recommendedPromptContainer.classList.remove('d-none');
}

function buttonPromptClick(promptText, value) {

  promptTextarea.value = value;
  promptTextarea.textContent = promptText;

  proccessPrompt();  // Continue processing the prompt

}


function proccessPrompt() {
  document.getElementById('initial-prompts').classList.add('d-none');
  document.getElementById('recommended-prompts').classList.remove('d-none');
  hidePreviewScreen();
  let prompt = promptTextarea.textContent;
  let promptValue = promptTextarea.value
  const userMessage = `
    <div class="queries-wrapper d-flex flex-row-reverse gap-2">
      <div class="user-account-img">
        <img src="../../static/images/user.png">
      </div>
      <div id="queries">
        ${fileContainer.children.length > 0 ? `<div class="d-flex flex-row-reverse flex-wrap gap-2">${filesQueriesContainer}</div>` : ''}
        <p dir="${checkDirection(selectedLanguagePrompt)}" class="query-text">${promptValue}</p>
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
    fetchRecommendedPrompts(textResult); 
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
  promptTextarea.value = null;
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
    promptTextarea.innerText = event.result.text;
    promptTextarea.value = event.result.text;
  };

  // Handle recognized events for final results
  recognizer.recognized = (sender, event) => {
    if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
      promptTextarea.innerText = event.result.text;
      promptTextarea.value = event.result.text;
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