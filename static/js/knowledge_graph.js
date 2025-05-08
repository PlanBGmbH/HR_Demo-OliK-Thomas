document.addEventListener('DOMContentLoaded', () => {
    let viz = null; //ensure viz is globally scoped

    fetch('/get_graph_data')  // This should be your endpoint that provides graph data
        .then(response => response.json())
        .then(graphData => {
            viz = new Neovis({
                container_id: "viz",
                labels: {
                    "Person": {
                        "caption": "name",
                        "size": "pagerank",
                        "community": "community"
                    },
                    "Law": {
                        "caption": "name"
                    }
                },
                relationships: {
                    "PROMULGATED_BY": {
                        "thickness": "weight",
                        "caption": false
                    }
                },
                arrows: true,
                hierarchical: true,
                hierarchical_sort_method: "directed"
            });

            viz.render(graphData);
        })
        .catch(error => console.error('Error fetching graph data:', error));

    // Handle prompt execution
    const runPromptButton = document.getElementById('sendBtn');
    runPromptButton.addEventListener('click', () => {
        const promptText = document.getElementById('promptTextarea').innerText;
        const placeholderResponse = `
            <div class="d-flex align-items-end gap-1">
                <p class="fs-14 fw-bold lh-sm">Analyzing</p>
                <div class="responding"></div>
            </div>
        `;

        document.getElementById('promptResult1').innerHTML = placeholderResponse
        document.getElementById('promptResult2').innerHTML = placeholderResponse


        fetch('/run_prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: promptText })
        })
        .then(response => response.json())
        .then(data => {
            data = data.result;
            const converter = new showdown.Converter({
                tables: true, // Enable support for Markdown tables
                simplifiedAutoLink: true, // Convert URLs to anchor tags automatically
                simpleLineBreaks: true, // Treat single line breaks as <br> tags
                strikethrough: true, // Enable support for strikethrough syntax
                tasklists: true // Enable support for task lists (checkboxes)
              });
            
              // Convert Markdown to HTML using Showdown
              const htmlResult = converter.makeHtml(data);
              // Remove any unwanted meta tags (if needed)
              const sanitizedResult = htmlResult.replace(/<meta[^>]+charset="UTF-8"[^>]*>/g, '');
            document.getElementById('promptResult1').innerHTML = sanitizedResult
        })
        .catch(error => console.error('Error running prompt:', error));


        fetch('/run_prompt_without_kg', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: promptText })
        })
        .then(response => response.json())
        .then(data => {
            data = data.result;
            const converter = new showdown.Converter({
                tables: true, // Enable support for Markdown tables
                simplifiedAutoLink: true, // Convert URLs to anchor tags automatically
                simpleLineBreaks: true, // Treat single line breaks as <br> tags
                strikethrough: true, // Enable support for strikethrough syntax
                tasklists: true // Enable support for task lists (checkboxes)
              });
            
              // Convert Markdown to HTML using Showdown
              const htmlResult = converter.makeHtml(data);
              // Remove any unwanted meta tags (if needed)
              const sanitizedResult = htmlResult.replace(/<meta[^>]+charset="UTF-8"[^>]*>/g, '');
            document.getElementById('promptResult2').innerHTML = sanitizedResult
        })
        .catch(error => console.error('Error running prompt:', error));
    });

    var promptTextarea = document.getElementById('promptTextarea');
    let promptBtn = document.querySelector('.send-icon-wrapper');
    const checkContent = () => {
    if (promptTextarea.textContent.trim() !== '') {
        promptTextarea.classList.add('focusing');
        promptBtn.classList.remove('fade');
    } else {
        promptTextarea.classList.remove('focusing');
        promptBtn.classList.add('fade');
    }
    }
    checkContent();
    promptTextarea.addEventListener('input', checkContent);
});