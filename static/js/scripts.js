document.addEventListener('DOMContentLoaded', function () {
    const uploadForm = document.getElementById('upload-form');
    const filesInput = document.getElementById('files');
    const uploadedFilesDiv = document.getElementById('uploaded-files');
    const analyzeButton = document.getElementById('analyze-button');
    const promptInput = document.getElementById('prompt-input');
    const resultSection = document.getElementById('analysis-result');
    const sessionHistoryElement = document.getElementById('session-history');
    const micButton = document.getElementById('mic-button');
    const imageGallery = document.getElementById('imageGallery');
    const languageSelect = document.getElementById('language-select');

    let previousSessions = {};
    let uploadedFiles = [];

    let isSpeaking = false;  // Boolean to track whether speech is in progress
    let audio = null;        // To track the current audio object
   
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

            fetch('/upload_new', {
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
            const promptelement = document.createElement('div');
            promptelement.className = 'chat-message-prompt';  
            promptelement.innerHTML = `<p>${prompt}</p>`;
            resultSection.appendChild(promptelement);

            // Show the loading indicator when the process starts
            showLoadingIndicator();

            fetch('/analyze_new', {
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
                    console.log(data.result);  // Log the image path instead of alert
                    displayResult(data || 'No result returned.', selectedLanguage);
                    displayImages(data['image_results'] || []);

                    // Hide the loading indicator after processing is done
                    hideLoadingIndicator();
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

    document.getElementById('speak-button').addEventListener('click', function() {
        const resultText = document.getElementById('analysis-result').innerText;
        const selectedLanguage = document.getElementById('language-select').value;
        const speakButton = document.getElementById('speak-button');
        
        if (!resultText) {
            console.error('No text available to synthesize.');
            return;
        }

      if (isSpeaking) {
        // Stop the current speech
        if (audio) {
            audio.pause();  // Stop the current audio
            audio.currentTime = 0;  // Reset to the beginning
        }
        isSpeaking = false;
        speakButton.innerText = 'Speak';  // Change button back to "Speak"
    } else {
        // Start speech synthesis
        fetch('/speak', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: resultText,
                language: selectedLanguage
            })
        })
        .then(response => response.blob())
        .then(blob => {
            const audioUrl = URL.createObjectURL(blob);
            audio = new Audio(audioUrl);
            audio.play();

            // Set up audio event listener to detect when speech ends
            audio.onended = function() {
                isSpeaking = false;
                speakButton.innerText = 'Speak';  // Reset button to "Speak"
            };

            isSpeaking = true;
            speakButton.innerText = 'Stop';  // Change button text to "Stop"
            })
            .catch(error => console.error('Error in synthesizing speech:', error));
        }
    });


    function showLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }
    }

    function hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }

    // Additional function for applying direction to result section
    function applyDirectionBasedOnLanguage(language, element) {
        if (language === 'ar-SA' || language === 'ar') {
            element.setAttribute('dir', 'rtl');  // Right-to-left direction
            element.style.textAlign = 'right';   // Align text to the right
            element.classList.add('rtl');
            element.classList.remove('ltr');
        } else {
            element.setAttribute('dir', 'ltr');  // Left-to-right direction
            element.style.textAlign = 'left';    // Align text to the left
            element.classList.add('ltr');
            element.classList.remove('rtl');
        }
    }

    function convertMarkdownToHTML(markdownText) {
        let htmlText = markdownText;
    
        // Convert **bold** to <strong>bold</strong>
        htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
        // Convert numbered lists to <ol><li></li></ol>
        htmlText = htmlText.replace(/^\d+\.\s(.*?)(?=\n|$)/gm, '<li>$1</li>');
        htmlText = htmlText.replace(/(<li>.*<\/li>)+/g, '<ol>$&</ol>');  // Wrap in ordered list
    
        // Convert bullet points to <ul><li></li></ul>
        htmlText = htmlText.replace(/^\-\s(.*?)(?=\n|$)/gm, '<li>$1</li>');
        htmlText = htmlText.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');  // Wrap in unordered list
    
        // Convert inline `code` to <code>code</code>
        htmlText = htmlText.replace(/`(.*?)`/g, '<code>$1</code>');
    
        // Convert blockquote > to <blockquote>
        htmlText = htmlText.replace(/^\>\s(.*?)(?=\n|$)/gm, '<blockquote>$1</blockquote>');
    
        // Convert headers ## Header to <h2>Header</h2>, etc.
        htmlText = htmlText.replace(/^######\s(.*)/gm, '<h6>$1</h6>');
        htmlText = htmlText.replace(/^#####\s(.*)/gm, '<h5>$1</h5>');
        htmlText = htmlText.replace(/^####\s(.*)/gm, '<h4>$1</4>');
        htmlText = htmlText.replace(/^###\s(.*)/gm, '<h3>$1</h3>');
        htmlText = htmlText.replace(/^##\s(.*)/gm, '<h2>$1</h2>');
        htmlText = htmlText.replace(/^#\s(.*)/gm, '<h1>$1</h1>');
    
        // Convert markdown tables to HTML tables
        // This regex captures rows and cells
        const tableRows = markdownText.match(/^\|(.+)\|$/gm);
        if (tableRows) {
            const tableHeaders = tableRows[0].split('|').map(cell => `<th>${cell.trim()}</th>`).join('');
            const tableBody = tableRows.slice(1).map(row => {
                const cells = row.split('|').map(cell => `<td>${cell.trim()}</td>`).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
            htmlText = `<table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableBody}</tbody></table>`;
        }
    
        return htmlText;
    }
    

    function displayImages(imageResults) {
        console.log(imageResults);  // Log the image path instead of alert
        //alert(imageResults.length);
        // If no images are provided, hide the image gallery div
        if (!imageResults || imageResults.length === 0) {
            imageGallery.style.display = 'none';
            return;
        } else {
            imageGallery.style.display = 'flex';  // Or any other display type you'd like
        }

        if (imageGallery) {
            imageGallery.innerHTML = ''; // Clear any existing images
            imageResults.forEach(imageResult => {
                console.log("Image Path:", imageResult.image_data);  // Log the image path for debugging
                const imgElement = document.createElement('img');
                imgElement.src = imageResult.image_data;
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
                // alert(result.text);
                // alert("In if result.reason");
                // Additional logging to debug the speech recognition
                console.log('Recognized Speech:', result.text);

                // Detect the language of the recognized speech
                const detectedLanguage = await detectLanguage(result.text);
                console.log('Detected Language:', detectedLanguage);
                
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
        //alert("In Detect Language function");
        return fetch('/detect-language', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        })
        .then(response => response.json())
        .then(data => data.language);  // Return the detected language
        //alert(data.language);
    }

    function displayUploadedFiles(files) {
        const uploadedFilesSection = document.getElementById('uploaded-files');

        if (uploadedFilesSection) {
            uploadedFilesSection.innerHTML = '';
            files.forEach(file => {
                const fileElement = document.createElement('div');
                const iconElement = document.createElement('img'); // For the icon

                // Define icons for file types
                const fileIcons = {
                    'pdf': '/static/images/upload_pdf.png',
                    'docx': '/static/images/upload_docx.png',
                    'mp4': '/static/images/upload_mp4.png',
                    'jpeg': '/static/images/upload_jpeg.png',
                    'png': '/static/images/upload_png.png',
                    'txt': '/static/images/upload_txt.png',
                    'gif': '/static/images/upload_gif.png',
                    'jpg': '/static/images/upload_jpg.png'
                    // Add more file types and icons as needed
                };

                // Extract file extension
                const fileExtension = file.split('.').pop().toLowerCase();

                // Set the icon based on file type
                iconElement.src = fileIcons[fileExtension] || '/static/icons/default_icon.png'; // Default icon if type not found
                iconElement.alt = fileExtension;
                iconElement.style.maxWidth = '30px'; // Set icon size
                iconElement.style.marginRight = '10px'; // Space between icon and file name

                // Append the icon to the file element
                fileElement.appendChild(iconElement);

                // Check if the file is an image
                if (/\.(jpe?g|png|gif)$/i.test(file)) {
                    const imgElement = document.createElement('img');
                    imgElement.src = `/static/uploads/${file}`;
                    imgElement.alt = file;
                    imgElement.style.maxWidth = '100px';
                    imgElement.style.maxHeight = '100px';
                    fileElement.appendChild(imgElement);
                } else {
                    const fileNameElement = document.createElement('span');
                    fileNameElement.textContent = file; // Display the file name
                    fileElement.appendChild(fileNameElement); // Append file name after the icon
                }

                // Append the file element to the section
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
        // Clear the result section

        // If there is no result or resultSection element, return early
        if (!result || !resultSection) {
            console.error('No result or result section found.');
            return;
        }

        // Create a wrapper to display images and content together
        const wrapper = document.createElement('div');
        wrapper.className = 'result-wrapper';  // Add CSS for this class in your styles
        //language = 'ar-SA';
        // Dynamically apply text direction based on the language
        applyDirectionBasedOnLanguage(language, wrapper);

        // Apply RTL or LTR styling based on the selected language
        if (language === 'ar' || language === 'ar-SA') {
            wrapper.style.direction = 'rtl';
            wrapper.style.textAlign = 'right';
        } else {
            wrapper.style.direction = 'ltr';
            wrapper.style.textAlign = 'left';
        }

        // Add images if any exist
        if (result.image_results && Array.isArray(result.image_results)) {
            result.image_results.forEach(imageResult => {
                console.log(imageResult.image_data);  // Log the image path instead of alert

                // Initialize resultItem here
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';  // Apply Flexbox container styling

                const imgElement = document.createElement('img');
                imgElement.src = imageResult.image_data.startsWith('http') ? imageResult.image_data : `data:image/png;base64,${imageResult.image_data}`;
                imgElement.alt = "Analyzed Image";
                imgElement.className = 'responsive-image';  // Add this CSS class

                const descriptionElement = document.createElement('div');
                descriptionElement.className = 'description-text';
                descriptionElement.innerHTML = `${imageResult.description}`;  // Add image description    

                // Append image and description into the result item
                resultItem.appendChild(imgElement);
                resultItem.appendChild(descriptionElement);

                // Append the result item to the wrapper
                wrapper.appendChild(resultItem);

            });
        }

        // Add text results (summary, recognized objects, etc.)
        if (result.text_results) {
            let textResult = result.text_results;

            // Strip out "```html" and "```" from the result if they exist
            textResult = textResult.replace(/```html/g, "").replace(/```/g, "");
            
            const textElement = document.createElement('p');
            console.log('Text before cleanMarkdown:', textResult);
            const cleanMarkdown = textResult.replace(/^-+\|-+$/gm, "");  // Remove lines of dashes
            console.log('Text after cleanMarkdown:', cleanMarkdown);
            // Convert the markdown-like syntax in the result to HTML using the helper function
            const formattedText = convertMarkdownToHTML(cleanMarkdown);
            textElement.innerHTML = `${textResult}`;  // Insert formatted HTML
            wrapper.appendChild(textElement);
        }

        // Append the wrapper to the result section
        resultSection.appendChild(wrapper);  // This will now correctly append the HTML elements to the result section
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

