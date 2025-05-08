document.addEventListener('DOMContentLoaded', () => {
    const runPromptButton = document.getElementById('sendBtn');
    const promptTextarea = document.getElementById('promptTextarea');
    const promptResult = document.getElementById('promptResult');

    runPromptButton.addEventListener('click', () => {
        const promptText = promptTextarea.value.trim();
        if (!promptText) return; // Do nothing if textarea is empty

        const placeholderResponse = `
            <div class="d-flex align-items-end gap-1">
                <p class="fs-14 fw-bold lh-sm">Analyzing</p>
                <div class="responding"></div>
            </div>
        `;

        // Set the placeholder response
        promptResult.innerHTML = placeholderResponse;

        fetch('/run_prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: promptText })
        })
        .then(response => response.json())
        .then(data => {
            // Log the data to see what you get
            console.log('Fetch response:', data);

            const converter = new showdown.Converter({
                tables: true,
                simplifiedAutoLink: true,
                simpleLineBreaks: true,
                strikethrough: true,
                tasklists: true
            });

            // Convert and update the result
            const htmlResult = converter.makeHtml(data.result);
            promptResult.innerHTML = htmlResult; // Update only after the fetch completes
        })
        .catch(error => console.error('Error running prompt:', error));
    });

    const checkContent = () => {
        if (promptTextarea.value.trim() !== '') {
            promptTextarea.classList.add('focusing');
            runPromptButton.classList.remove('fade');
        } else {
            promptTextarea.classList.remove('focusing');
            runPromptButton.classList.add('fade');
        }
    }

    promptTextarea.addEventListener('input', checkContent);
});
