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
const newChatButtonShowChat = document.getElementById('newChatButtonShowChat');
const newChatButtonHideChat = document.getElementById('newChatButtonHideChat');

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
  'de-DE': 'Geben Sie hier Ihre Nachricht ein...'
};

// Initialization functions
function initialize() {
  console.log("TEST1")
  setPromptTextareaWidth();
  checkContent();
  console.log("TEST2")
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
  if (isSpeaking) {
    stopSpeak();
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
        console.log('Speech synthesis completed and isSpeaking is: ', isSpeaking);
      } else {
        console.error('Speech synthesis failed:', result.errorDetails);
        resetSpeechState();
      }
    },
    function (error) {
      console.error('Error during speech synthesis:', error);
      resetSpeechState();
    }
  );

  // Use a Promise or callback to ensure isSpeaking is set after synthesis starts
  synthesizer.synthesisStarted = () => {
    isSpeaking = true;
    console.log('Speech synthesis actually started. isSpeaking:', isSpeaking);
  };
}

function resetSpeechState() {
  isSpeaking = false;
  console.log('Speech state reset. isSpeaking:', isSpeaking);

  if (synthesizer) {
    synthesizer.close();
    synthesizer = null;
  }
  if (player) {
    player = null;
  }
}

// Function to stop speaking
function stopSpeak() {
  console.log('Stop speech triggered. Current isSpeaking is: ', isSpeaking);
  if (synthesizer) {
    console.log('Synthesizer is true');
    try
    {
      // Stop speech synthesis
      synthesizer.close();
      console.log('Synthesizer is closed');

      // Pause the player and close the synthesizer
      if (player) {
        player.pause();
        console.log('Player is paused.');
      }
    }
    catch (error) {
      console.error('Error stopping speech synthesis:', error);
    }
    finally {
      // Reset the speech state
      resetSpeechState();
    }
  }
  else {
    console.log('synthesizer, isSpeaking is: ', synthesizer, isSpeaking);
  }
}

function addSpeakListeners() {
  document.querySelectorAll('#speak').forEach((speakButton) => {
    speakButton.addEventListener('click', function () {
      const parentDiv = speakButton.closest('div');
      const stopSpeakButton = parentDiv.querySelector('#stopSpeak');
      const text_results = parentDiv.parentElement.parentElement.querySelector('#query-result').innerText
      speakText(text_results,selectedLanguagePrompt);
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
    addResponse(data.translated_text, targetLanguage);
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
  if (['ar-SA', 'ar-QA', 'ar-EG', 'ur-IN'].includes(language))  {
    return 'rtl';
  } else {
    return 'ltr';
  }
}

function addResponse(result, language, isSpeechInput=false){

  // Convert Markdown to HTML using Marked
  const sanitizedResult = marked.parse(result);
  let responseMessage = null;
  // If input is via speech
  if (isSpeechInput) {
    responseMessage = `
    <div class="response-wrapper d-flex flex-row gap-2" dir="${checkDirection(language)}">
      <div class="user-account-img">
        <img src="../../static/images/PlanBLogo.jpeg">
      </div>
      <div id="response">
        <div id ="query-result" dir="${checkDirection(language)}">${sanitizedResult}</div>
        <div class="additional-options mt-3 d-flex align-items-center gap-2">
          <div class="btns-wrapper d-inline-flex align-items-center">
            <button class="btn py-0 ps-0 d-none" id="speak">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="speak-icon">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M11 4.9099C11 4.47485 10.4828 4.24734 10.1621 4.54132L6.67572 7.7372C6.49129 7.90626 6.25019 8.00005 6 8.00005H4C3.44772 8.00005 3 8.44776 3 9.00005V15C3 15.5523 3.44772 16 4 16H6C6.25019 16 6.49129 16.0938 6.67572 16.2629L10.1621 19.4588C10.4828 19.7527 11 19.5252 11 19.0902V4.9099ZM8.81069 3.06701C10.4142 1.59714 13 2.73463 13 4.9099V19.0902C13 21.2655 10.4142 22.403 8.81069 20.9331L5.61102 18H4C2.34315 18 1 16.6569 1 15V9.00005C1 7.34319 2.34315 6.00005 4 6.00005H5.61102L8.81069 3.06701ZM20.3166 6.35665C20.8019 6.09313 21.409 6.27296 21.6725 6.75833C22.5191 8.3176 22.9996 10.1042 22.9996 12.0001C22.9996 13.8507 22.5418 15.5974 21.7323 17.1302C21.4744 17.6185 20.8695 17.8054 20.3811 17.5475C19.8927 17.2896 19.7059 16.6846 19.9638 16.1962C20.6249 14.9444 20.9996 13.5175 20.9996 12.0001C20.9996 10.4458 20.6064 8.98627 19.9149 7.71262C19.6514 7.22726 19.8312 6.62017 20.3166 6.35665ZM15.7994 7.90049C16.241 7.5688 16.8679 7.65789 17.1995 8.09947C18.0156 9.18593 18.4996 10.5379 18.4996 12.0001C18.4996 13.3127 18.1094 14.5372 17.4385 15.5604C17.1357 16.0222 16.5158 16.1511 16.0539 15.8483C15.5921 15.5455 15.4632 14.9255 15.766 14.4637C16.2298 13.7564 16.4996 12.9113 16.4996 12.0001C16.4996 10.9859 16.1653 10.0526 15.6004 9.30063C15.2687 8.85905 15.3578 8.23218 15.7994 7.90049Z" fill="currentColor"></path>
              </svg>
            </button>
            <button class="btn py-0 ps-0" id="stopSpeak">
                <span class="material-symbols-rounded" style="font-size: 20px">
                stop_circle
              </span>
            </button>
          </div>
          <div class="btns-wrapper d-inline-flex align-items-center gap-1">
            <div class="img-wrapper">
              <img src="../../static/images/language.png" class="w-20 h-20 object-fit-cover" id="flagImage">
            </div>
            <select name="" id="responseLang" class="cursor-pointer bg-transparent border-0 outline-none">
              <option value="en-US">English</option>
              <option value="de-DE">German</option>
            </select>
          </div>
        </div>
      </div>
    </div>`;
  }
  else {
    responseMessage = `
      <div class="response-wrapper d-flex flex-row gap-2" dir="${checkDirection(language)}">
        <div class="user-account-img">
          <img src="../../static/images/PlanBLogo.jpeg">
        </div>
        <div id="response">
          <div id ="query-result" dir="${checkDirection(language)}">${sanitizedResult}</div>
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
            </div>
            <div class="btns-wrapper d-inline-flex align-items-center gap-1">
              <div class="img-wrapper">
                <img src="../../static/images/language.png" class="w-20 h-20 object-fit-cover" id="flagImage">
              </div>
              <select name="" id="responseLang" class="cursor-pointer bg-transparent border-0 outline-none">
                <option value="en-US">English</option>
                <option value="de-DE">German</option>
              </select>
            </div>
          </div>
        </div>
      </div>`;
  }
  
  chatBoxContainer.innerHTML += responseMessage;
  const latestResponse = chatBoxContainer.lastElementChild;
  latestResponse.scrollIntoView({ behavior: 'smooth' });
  let allResponses = document.querySelectorAll('#responseLang');
  let latestResponseLang = allResponses[allResponses.length - 1];
  latestResponseLang.value = language;
  addSpeakListeners();
  addChangeLanguageListeners();

}

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
          <p class="fs-14 fw-bold lh-sm jumping-text">Analyzing...</p>
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

function proccessHRPrompt(isSpeechInput=false) {
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
          <p class="lh-sm jumping-text">Analyzing...</p>
          <div class="responding"></div>
        </div>
      </div>
    </div>`;
  chatBoxContainer.innerHTML += placeholderResponse;
  const latestResponse = chatBoxContainer.lastElementChild;
  latestResponse.scrollIntoView({ behavior: 'smooth' });

  const sendButton = document.getElementById('sendBtn');
  const threadId = sendButton.getAttribute('thread-id'); // Get the thread ID from the attribute
  if (threadId === 'New') {
    sendButton.removeAttribute('thread-id');
  }
  fetch('/analyse-hr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      language: selectedLanguagePrompt, 
      threadId: threadId
    })
  })
  .then(response => response.json())
  .then(async data => {
    // Replace the placeholder with the actual response
    document.getElementById('analyzingMessage').remove(); // Remove the "Analyzing" message
    let textResult = data.response_text;
    let textResult_with_source = textResult;
    if(data.response_file === "Information der Geschäftsleitung.pdf") {
      textResult_with_source = textResult + 
      `<br>[Source: 
      <a href="https://blobstorageplanb.blob.core.windows.net/container/Information%20der%20Gesch%C3%A4ftsleitung.pdf?sp=r&st=2024-11-05T12:52:25Z&se=2025-04-30T19:52:25Z&sv=2022-11-02&sr=b&sig=cF443hkf8m301Tk7Jk42eTRC5KCW5ujfXYjo6%2FZRnvY%3D" target="_blank">
      Information der Geschäftsleitung.pdf</a>]</br>`
    }
    
    // Add actual response
    addResponse(textResult_with_source || 'No result returned.', selectedLanguagePrompt, isSpeechInput);
    if (isSpeechInput) {
      // Call TextToSpeech function
      await textToSpeech(textResult, selectedLanguagePrompt, isSpeaking=true);
    }
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

function textToSpeech(text, language) {
  if (!text) 
    return;

  const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(azureSpeechKey, azureSpeechRegion); 
  speechConfig.speechSynthesisLanguage = language;
  if (language == 'en-US') {speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';}
  else if (language == 'de-DE') {speechConfig.speechSynthesisVoiceName = 'de-DE-TabjaNeural';}
  
  synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);

  speakText(text, language);
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

      // Reset the view
      const chatSection = document.querySelector('.chat-section');
      chatSection.classList.remove('initial');
      chatSection.classList.add('default');

      // Hide all buttons
      initialPromptButtons.forEach(button => {
        button.style.display = 'none';
      });

      proccessHRPrompt(isSpeechInput=true);
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
  if (['ar-SA', 'ar-QA', 'ar-EG', 'ur-IN'].includes(selectedLanguagePrompt)){
    promptTextarea.setAttribute('dir', 'rtl');
  } else {
    promptTextarea.setAttribute('dir', 'ltr');
  }
}

// Function to load chat history
async function loadChatHistory() {
  try {
    // Set direction for chat history
    const chatBotSection = document.querySelector('.chatbot-section');
    const direction = checkDirection(chatLang.value);
    chatBotSection.classList.toggle('rtl', direction === 'rtl');
    chatBotSection.classList.toggle('ltr', direction === 'ltr');

    const response = await fetch('/chat-history');
    const chatHistory = await response.json();

    // Clear the chat container first
    const chatListContainer = document.getElementById('chatListContainer');
    chatListContainer.innerHTML = '';

    // Check if chatHistory is null or empty
    if (!chatHistory || Object.keys(chatHistory).length === 0) {
      chatListContainer.innerHTML = '<p>No chat history found.</p>';
      return;
    }

    feedback.threadId = Object.values(chatHistory[0])[0];

    // Iterate over the entries in the chatHistory dictionary
    chatHistory.forEach(threadItem => {
      const chatKey = Object.keys(threadItem)[0];
      const threadId = threadItem[chatKey];

      // Create a clickable button for each chat entry
      const chatEntry = document.createElement('button');
      chatEntry.classList.add('chat-history-entry'); // Add a class for styling if needed
      chatEntry.innerHTML = `
      <div class="chat-history-item d-flex align-items-center p-2 mb-2">
        <div class="chat-info flex-grow-1 ms-2">
          <p class="chat-title mb-0" id="chat-title-${threadId}">${chatKey}</p>
        </div>
        
        <div class="dropdown ms-auto" onclick="event.stopPropagation();">
          <button class="btn btn-more-options" onclick="toggleMenu(this)">
            <span class="material-symbols-rounded">more_horiz</span>
          </button>
          <div class="dropdown-menu">
            <button class="btn btn-edit" onclick="editTitle('${threadId}')">
              <span class="material-symbols-rounded">edit</span>
              <span>Edit Title</span>
            </button>
            <button class="btn btn-delete" onclick="deleteChat('${threadId}')">
              <span class="material-symbols-rounded">delete</span>
              <span>Delete Chat</span>
            </button>
          </div>
        </div>
      </div>`; // Display the chat key
      //<span class="material-symbols-rounded chat-icon">chat</span>

      // Add an event listener to handle clicks on the chat entry
      chatEntry.addEventListener('click', () => {
        // Set the thread ID on the send button
        const sendButton = document.getElementById('sendBtn');
        sendButton.setAttribute('thread-id', threadId);

        // Remove 'active' class from all chat history entries
        const chatHistoryEntries = document.querySelectorAll('.chat-history-entry');
        chatHistoryEntries.forEach(entry =>entry.classList.remove('active'));

        // Add active class to the clicked chat history entry
        chatEntry.classList.add('active');

        // Call function to load particular chat with threadId
        handleChatEntryClick(threadId);
      });

      // Append the chat entry to the chat list container
      chatListContainer.appendChild(chatEntry);
    });
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
}

// Function to handle the click event on a chat entry
async function handleChatEntryClick(threadId) {
  console.log('Chat entry clicked with Thread ID:', threadId);
  feedback.threadId = threadId;
  // Call function with the threadId to get chat history for given thread
  try {
    const response = await fetch('/chat-history-thread', {
      method: 'POST',
      headers: {
        'Content-Type' : 'application/json'
      },
      body: JSON.stringify({thread_id: threadId})
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chat history for given thread ID');
    }

    const result = await response.json();
    console.log('Received results');

    // Clear the existing chat box content
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';

    // Adjust styling for new chat
    const chatSection = document.querySelector('.chat-section');
    chatSection.classList.remove('initial');
    chatSection.classList.add('default');

    // Hide all initial prompts again
    const initialPromptButtons = document.querySelectorAll('.initial-prompts');
    initialPromptButtons.forEach(button => button.style.display = 'none');

    // Display the fetched messages in the chat box
    result.forEach((message) => {
      if(message.role === "user") {
        const userMessage = `
          <div class="queries-wrapper d-flex flex-row-reverse gap-2">
            <div class="user-account-img">
              <img src="../../static/images/user.png">
            </div>
            <div id="queries">
              ${fileContainer.children.length > 0 ? `<div class="d-flex flex-row-reverse flex-wrap gap-2">${filesQueriesContainer}</div>` : ''}
              <p dir="${checkDirection(selectedLanguagePrompt)}" class="query-text">${message.content}</p>
            </div>
          </div>`;
        chatBoxContainer.innerHTML += userMessage;
      }
      else if(message.role === "assistant") {
        // Convert Markdown to HTML using Marked
        const sanitizedResult = marked.parse(message.content);
        const userMessage = `
          <div class="response-wrapper d-flex flex-row gap-2">
            <div class="user-account-img">
              <img src="../../static/images/PlanBLogo.jpeg">
            </div>
            <div id="response">
              <div id ="query-result" dir="${checkDirection(selectedLanguagePrompt)}">${sanitizedResult}</div>
            </div>
          </div>`;
        chatBoxContainer.innerHTML += userMessage;
      }
      else {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.innerHTML = `<div class="message-content">Message is not from user or assistant: ${message.content ? message.content : 'No content'}</div>`;
        chatBox.appendChild(messageDiv);
      }
    });

    // Scroll to the bottom of the chat box
    chatBox.scrollTop = chatBox.scrollHeight;

  } catch(error) {
    console.error('Error fetching chat history for thread ID:', error);
  }
}

// Function to toggle chat menu
function toggleMenu(button) {
  // Close currently opened dropdowns
  const openDropdowns = document.querySelectorAll('.dropdown.show')
  openDropdowns.forEach(dropdown => {
    if(dropdown !== button.closest('.dropdown')) {
      dropdown.classList.remove('show');
    }
  });
  const dropdown = button.closest('.dropdown');
  dropdown.classList.toggle('show');
}

// Close the dropdown menu if the user clicks outside of it
document.addEventListener('click', function(event) {
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(dropdown => {
      if (!dropdown.contains(event.target)) {
          dropdown.classList.remove('show');
      }
  });
});

// Function to create new chat
async function newChat() {
  console.log('New Chat initiated');

  // Fetch the username
  //const response = await fetch('/get-username');
  //const username_json = await response.json();
  //const username = username_json['username'].split(" ")[0];
   
  // Clear the existing chat box content
  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = '';
  chatBox.innerHTML = `
      <div class="preview-screen d-flex flex-column justify-content-center">
        <h2 class="text-center mb-5">Hello, how can I help you today?</h2>
      </div>
  `;

  const sendButton = document.getElementById('sendBtn');
  sendButton.setAttribute('thread-id', 'New');

  // Adjust styling for new chat
  const chatSection = document.querySelector('.chat-section');
  chatSection.classList.remove('default');
  chatSection.classList.add('initial');

  // Display all initial prompts again
  const initialPromptButtons = document.querySelectorAll('.initial-prompts');
  initialPromptButtons.forEach(button => button.style.display = 'block');
}

// Function to edit the chat title
function editTitle(threadId) {
  console.log("Editing Title for thread ID: ", threadId);

  const titleElement = document.getElementById(`chat-title-${threadId}`);

  // Set title to be editable
  titleElement.contentEditable = 'true';
  titleElement.focus();

  // Add an event listener to save the title when the user clicks outside
  titleElement.addEventListener('blur', () => {
    updateChatTitle(titleElement, threadId);
  });

  // Handle pressing 'Enter' to save the title
  titleElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
          e.preventDefault(); // Prevent the default action of adding a newline
          updateChatTitle(titleElement, threadId);
      }
  });
}

let feedback = {
  threadId: 'New',
  quick: null,
  sufficient: null,
  additional: '',
  time: null
};

// Function to select Feedback
function selectFeedback(question, value, element) {
  // Remove selected class from all buttons in the same question group
  const container = element.parentElement;
  container.querySelectorAll('.feedback-btn').forEach(btn => {
      btn.classList.remove('selected-up', 'selected-down');
  });

  // Add selected class to clicked button
  if (value === 'yes') {
      element.classList.add('selected-up');
  } else {
      element.classList.add('selected-down');
  }

  // Store the feedback
  feedback[question] = value;
}

// Function to submit feedback
async function submitFeedback() {
  feedback.additional = document.getElementById('additionalFeedback').value;
  feedback.time = new Date().toString()
  
  // Here you would typically send the feedback to your server
  console.log('Feedback submitted:', feedback);
  await fetch('/add-feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(feedback)
  })
  
  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('feedbackModal'));
  modal.hide();
  
  // Reset form
  resetForm();
}

// Reset the feedback form
function resetForm() {
  feedback.quick = null
  feedback.sufficient = null
  feedback.additional = ''
  
  document.querySelectorAll('.feedback-btn').forEach(btn => {
      btn.classList.remove('selected-up', 'selected-down');
  });
  
  document.getElementById('additionalFeedback').value = '';
}

// Functionalitiies for Initial Prompt Buttons
const ipHRGl = document.getElementById('hr-gl-btn');
const ipLeaveBal = document.getElementById('leave-bal-btn');
const ipPP1 = document.getElementById('personal-prompt-btn1');
const ipPP2 = document.getElementById('personal-prompt-btn2');
const initialPromptButtons = document.querySelectorAll('.initial-prompts');

// Event listeners
window.addEventListener('resize', setPromptTextareaWidth);
promptTextarea.addEventListener('input', checkContent);
promptTextarea.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();

    if (promptTextarea.textContent.trim() !== '') {
      proccessHRPrompt();
      const chatSection = document.querySelector('.chat-section');
      chatSection.classList.remove('initial');
      chatSection.classList.add('default');

      // Hide all buttons
      initialPromptButtons.forEach(button => {
        button.style.display = 'none';
      });
    }
    else {
      console.log('Cannot submit, no text provided');
    }
  }
})

// HR Guidelines Button
ipHRGl.addEventListener('click', function() {
  // Change styling for chat box
  const chatSection = document.querySelector('.chat-section');
  chatSection.classList.remove('initial');
  chatSection.classList.add('default');

  // Hide all buttons
  initialPromptButtons.forEach(button => {
    button.style.display = 'none';
  });

  promptTextarea.textContent = ipHRGl.getAttribute('question');
  proccessHRPrompt();
});

// Leave Balance Button
ipLeaveBal.addEventListener('click', function() {
  // Change styling for chat box
  const chatSection = document.querySelector('.chat-section');
  chatSection.classList.remove('initial');
  chatSection.classList.add('default');

  // Hide all buttons
  initialPromptButtons.forEach(button => {
    button.style.display = 'none';
  });

  promptTextarea.textContent = ipLeaveBal.getAttribute('question');
  proccessHRPrompt();
});

// Personalized Prompt Button 1
ipPP1.addEventListener('click', function() {
  // Change styling for chat box
  const chatSection = document.querySelector('.chat-section');
  chatSection.classList.remove('initial');
  chatSection.classList.add('default');

  // Hide all buttons
  initialPromptButtons.forEach(button => {
    button.style.display = 'none';
  });

  promptTextarea.textContent = ipPP1.getAttribute('question');
  proccessHRPrompt();
});

// Personalized Prompt Button 2
ipPP2.addEventListener('click', function() {
  // Change styling for chat box
  const chatSection = document.querySelector('.chat-section');
  chatSection.classList.remove('initial');
  chatSection.classList.add('default');

  // Hide all buttons
  initialPromptButtons.forEach(button => {
    button.style.display = 'none';
  });

  promptTextarea.textContent = ipPP2.getAttribute('question');
  proccessHRPrompt();
});

// To focus the typing area
window.addEventListener('load', function() {
  promptTextarea.focus();
});

// Ensuring the prompt area is always focused
promptTextarea.addEventListener('click', function() {
  this.focus();
});

// Adjust chat section and chat box styling
const sendButton = document.getElementById('sendBtn');
sendButton.addEventListener('click', function() {
  const chatSection = document.querySelector('.chat-section');
  chatSection.classList.remove('initial');
  chatSection.classList.add('default');

  // Hide all buttons
  initialPromptButtons.forEach(button => {
    button.style.display = 'none';
  });
});

// fileInput.addEventListener('change', filesShow);
// fileUploadButton.addEventListener('click', () => fileInput.click());
micButton.addEventListener('click', startMicrophone);
chatLang.addEventListener('change', changePlaceholder);
newChatButtonShowChat.addEventListener('click', newChat);
newChatButtonHideChat.addEventListener('click', newChat);

// Initial function call
initialize();