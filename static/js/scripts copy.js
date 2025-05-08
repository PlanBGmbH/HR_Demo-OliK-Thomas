document.addEventListener('DOMContentLoaded', function () {
    const uploadForm = document.getElementById('upload-form');
    const filesInput = document.getElementById('files');
    const uploadedFilesDiv = document.getElementById('uploaded-files');
    const analyzeButton = document.getElementById('analyze-button');
    const promptInput = document.getElementById('prompt-input');
    const resultSection = document.getElementById('result-section');
    const sessionHistoryElement = document.getElementById('session-history');
    const micButton = document.getElementById('mic-button');
    const imageGallery = document.getElementById('image-gallery');
    const languageSelect = document.getElementById('language-select');

    let previousSessions = {};
    let uploadedFiles = [];

    // Handle file selection and form submission
 /*   if (filesInput) {
        filesInput.addEventListener('change', function () {
            if (filesInput.files.length > 0) {
                uploadFiles(filesInput.files);  // Trigger custom upload function
            }
        });
    }

    // Custom upload function that does not submit the form
    function uploadFiles(files) {
        const formData = new FormData();

        // Append each file to the FormData object
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            formData.append('files[]', file);
        }
    /*
    if (uploadForm) {
        uploadForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (!filesInput || !filesInput.files.length) {
                console.error('No files selected or files input element not found.');
                return;
            }

            const formData = new FormData();
        
            // Debugging: Log each file's details
            for (let i = 0; i < filesInput.files.length; i++) {
                const file = filesInput.files[i];
                formData.append('files[]', file);
            }

            // Debugging: Log the files being uploaded
            console.log('Uploading files:', formData);
    */
        /*fetch('/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                uploadedFiles = data.filenames || [];
                alert(uploadedFiles);
                console.log('Files uploaded:', uploadedFiles);
                displayUploadedFiles(uploadedFiles);
            })
            .catch(error => {
                console.error('Error uploading files:', error);
            });*/
    /*});*/
    /*}*/
   
    if (filesInput) {
        filesInput.addEventListener('change', function () {

            if (filesInput.files.length > 0) {
                uploadForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', function (e) {

            e.preventDefault();

            if (!filesInput || !filesInput.files.length) {
                console.error('No files selected or files input element not found.');
                return;
            }

            const formData = new FormData();
        
                // Debugging: Log each file's details
            for (let i = 0; i < filesInput.files.length; i++) {
                const file = filesInput.files[i];
                console.log('File selected:', file.name, file.size, file.type);
                formData.append('files[]', file);
            }

            // Log the content of formData
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value.name}`);
                /*alert(`NAME: ${value.name}`);*/
            }

            /*for (let i = 0; i < filesInput.files.length; i++) {
                formData.append('files[]', filesInput.files[i]);
            }*/
            console.log(formData);

            fetch('/upload', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    /*alert(data.filenames);*/
                    uploadedFiles = data.filenames || [];
                    displayUploadedFiles(uploadedFiles);
                    // Automatically trigger analysis after files are uploaded
                    // analyzeButton.click();  // Trigger analysis automatically
                })
                .catch(error => {
                    console.error('Error uploading files:', error);
                });
        });
    }

    if (analyzeButton) {
        analyzeButton.addEventListener('click', function () {
            if (!promptInput) {
                console.error('Prompt input element not found.');
                return;
            }
            const prompt = promptInput.value;
            const selectedLanguage = languageSelect.value;

            fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filenames: uploadedFiles,
                    prompt: prompt,
                    language: selectedLanguage  
                })
            })
                .then(response => response.json())
                .then(async data => {
                    let translatedResult = data.result;
                    console.log(typeof data);
                    console.log(typeof data.result);
                    const selectedLanguage = "en";/*languageSelect.value; */
                    if (selectedLanguage !== 'en') {
                        translatedResult = await translateText(data.result, selectedLanguage);
                    }
                    alert(data.result);
                    displayResult(translatedResult || 'No result returned.', selectedLanguage);
                    displayImages(data['image-paths'] || []);
                    /*loadSessions();*/
                })
                .catch(error => {
                    console.error('Error analyzing prompt:', error);
                });
        });
    }

    if (micButton) {
        micButton.addEventListener('click', function () {
            startMicRecording();
        });
    }

    async function translateText(text, targetLanguage) {
        return fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                to: targetLanguage
            })
        })
        .then(response => response.json())
        .then(data => data.translatedText);
    }

    // Add the event listener for language selection change
    document.getElementById('language-select').addEventListener('change', function () {
        const selectedLanguage = this.value;
        const promptInput = document.getElementById('prompt-input');
        
        // Set the text direction and alignment based on the selected language
        if (selectedLanguage === 'ar-SA') {
            promptInput.setAttribute('dir', 'rtl');  // Set right-to-left direction
            promptInput.style.textAlign = 'right';   // Align text to the right
        } else {
            promptInput.setAttribute('dir', 'ltr');  // Set left-to-right direction
            promptInput.style.textAlign = 'left';    // Align text to the left
        }
    });


    function displayImages(imagePaths) {
        alert(imagePaths);
        if (imageGallery) {
            imageGallery.innerHTML = ''; // Clear any existing images
            imagePaths.forEach(imagePath => {
                console.log("Image Path:"); //, imagePath); // Log the image path
                const imgElement = document.createElement('img');
                imgElement.src = imagePath;
                imgElement.alt = "Related Image";
                imgElement.className = 'responsive-image';
                imageGallery.appendChild(imgElement);
            });
        } else {
            console.error('Image gallery element not found.');
        }
    }

    async function startMicRecording() {
        const selectedLanguage = document.getElementById('language-select').value;
        console.log("Selected language for speech recognition:", selectedLanguage);

        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription("43fc3c57232c449d9229448e12bbb1db", "westeurope");
        speechConfig.speechRecognitionLanguage = selectedLanguage;

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizeOnceAsync(
            async (result) => {
            console.log('Recognition Result:', result);  // Log the entire result for debugging
            if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                promptInput.value = result.text;
                alert(result.text);
                alert("In if result.reason");
                // Additional logging to debug the speech recognition
                console.log('Recognized Speech:', result.text);

                // Detect the language of the recognized speech
                const detectedLanguage = await detectLanguage(result.text);
                console.log('Detected Language:', detectedLanguage);
                alert("Here");

                // Optionally, detect the language of the recognized speech here if needed
                let translatedPrompt = result.text;
                if (detectedLanguage !== 'en') {
                    translatedPrompt = await translateText(result.text, 'en');
                }

                triggerAnalysis(translatedPrompt); // Trigger the analysis immediately after recognition 
            } else {
                console.error("Speech not recognized or an error occurred.");
            }

            recognizer.close();
        },
            function (err) {
                console.error("Error during speech recognition: " + err);
                recognizer.close();
            }
        );
    }

    function triggerAnalysis() {
        if (!promptInput) {
            console.error('Prompt input element not found.');
            return;
        }
        const prompt = promptInput.value;
        fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filenames: uploadedFiles,
                prompt: prompt
            })
        })
            .then(response => response.json())
            .then(data => {
                displayResult(data.result || '@@@@No result returned.');
                /*loadSessions();*/
            })
            .catch(error => {
                console.error('Error analyzing prompt:', error);
            });
    }

    async function detectLanguage(text) {
        alert("In Detect Language function");
        return fetch('/detect-language', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        })
        .then(response => response.json())
        .then(data => data.language);  // Return the detected language
        alert(data.language);
    }

    function displayUploadedFiles(files) {
        const uploadedFilesSection = document.getElementById('uploaded-files');

        if (uploadedFilesSection) {
            uploadedFilesSection.innerHTML = '';
            files.forEach(file => {
                const fileElement = document.createElement('div');

                // Check if the file is an image
                if (/\.(jpe?g|png|gif)$/i.test(file)) {
                    const imgElement = document.createElement('img');
                    imgElement.src = `/static/uploads/${file}`;
                    imgElement.alt = file;
                    imgElement.style.maxWidth = '100px';
                    imgElement.style.maxHeight = '100px';
                    fileElement.appendChild(imgElement);
                } else {
                    fileElement.textContent = file;
                }

                uploadedFilesSection.appendChild(fileElement);
            });
        } else {
            console.error('Uploaded files section element not found.');
        }           
    }

    function displayResult(result, language) {
        console.log("Raw results:", result);  // Log the entire result set to check the structure

        /*if (!result || !Array.isArray(result)) {
            console.error("No result data received");
            return;
        }*/
        console.log(typeof result);
        alert("IN DISPLAY RESULT");
 
        // Iterate through each result in the array
        result.forEach(result => {
            if (resultSection) {
                // Clear the result section
                resultSection.innerHTML = '';

                console.log("Language:", language);  // Log language to verify

                // Apply RTL or LTR styling based on the selected language
                if (language === 'ar' || language === 'ar-gulf') {
                    resultSection.style.direction = 'rtl';
                    resultSection.style.textAlign = 'right';
                } else {
                    resultSection.style.direction = 'ltr';
                    resultSection.style.textAlign = 'left';
                }

                console.log("Before processing images...");

                // Handle image results
                if (result.image_results && Array.isArray(result.image_results)) {
                    console.log("Processing image results:", result.image_results);  // Log to confirm image results
                    result.image_results.forEach(imageResult => {
                        const imgElement = document.createElement('img');

                        // Log the image data being processed
                        console.log("Image Data:", imageResult.image_data);


                        if (imageResult.image_data.startsWith('http') || imageResult.image_data.startsWith('/')) {
                            imgElement.src = imageResult.image_data;
                        } else {
                            imgElement.src = `data:image/png;base64,${imageResult.image_data}`;
                        }
    

                        imgElement.alt = "Analyzed Image";
                        imgElement.className = 'responsive-image'; // Add any custom styling

                        const descriptionElement = document.createElement('p');
                        descriptionElement.textContent = `Description: ${imageResult.description}`;

                        resultSection.appendChild(imgElement);
                        resultSection.appendChild(descriptionElement);
                    });
                } else {
                    console.log("No image results found.");
                }

                // Handle document results if they exist
                if (result.document_results && Array.isArray(result.document_results)) {
                    const docElement = document.createElement('div');
                    result.document_results.forEach(doc => {
                        const docContent = document.createElement('p');
                        docContent.textContent = `Document: ${doc}`;
                        resultSection.appendChild(docElement);
                    });
                } else {
                    console.log("No document results found.");
                }    
                // Fallback for when no result is returned
                if (!result.image_results && !result.document_results) {
                    resultSection.innerHTML = `<p>${result}</p>`;
                }
            } else {
                console.error('Result section element not found.');
            }
        });
    }

    function typeText(element, text, speed) {
        let index = 0;

        function type() {
            // If we find an opening tag '<', type until the closing '>'
            if (text[index] === '<') {
                let tag = '';
                while (text[index] !== '>' && index < text.length) {
                    tag += text[index];
                    index++;
                }
                tag += '>'; // Include the '>'
                element.innerHTML += tag;
                index++;
            } else {
                element.innerHTML += text[index];
                index++;
            }

            // Continue typing until the end of the text
            if (index < text.length) {
                setTimeout(type, speed);
            }
        }

        type();
    }

    function loadSessions() {
        fetch('/sessions')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const sessions = data.sessions || [];
                displaySessionHistory(sessions);
            })
            .catch(error => {
                console.error('Error loading sessions:', error);
            });
    }

    function displaySessionHistory(sessions) {
        if (sessionHistoryElement) {
            sessionHistoryElement.innerHTML = ''; // Clear previous content
            if (Array.isArray(sessions)) {
                sessions.forEach(session => {
                    const session_id = session.session_id;
                    const sessionDiv = document.createElement('div');
                    const previousPrompts = previousSessions[session_id] || [];

                    sessionDiv.classList.add('session-item');
                    sessionDiv.innerHTML = `<h4>Session ID: ${session_id}</h4>`;

                    session.prompts.forEach((prompt, index) => {
                        const previousPrompt = previousPrompts[index];
                        const promptChanged = !previousPrompt || 
                            previousPrompt.prompt !== prompt.prompt || 
                            previousPrompt.result !== prompt.result;

                        if (promptChanged) {
                            const promptResponseDiv = document.createElement('div');
                            promptResponseDiv.classList.add('prompt-response-item');
                            promptResponseDiv.innerHTML = `
                                <p><strong>Prompt:</strong> ${prompt.prompt}</p>
                                <p><strong>Response:</strong> ${prompt.result}</p>
                            `;
                            sessionDiv.appendChild(promptResponseDiv);
                        }
                    });

                    sessionHistoryElement.appendChild(sessionDiv);

                    // Update the previous session data with the current state
                    previousSessions[session_id] = session.prompts;

                });
            } else {
                console.error('Sessions data is not an array.');
            }
        } else {
            console.error('Session history element not found.');
        }
    }

    /*loadSessions();*/
});

