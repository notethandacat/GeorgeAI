// Your new Flask Proxy URL
const PROXY_URL = 'https://ai-write-nine.vercel.app/proxy/';
// The actual Cerebras endpoint (without the proxy prefix)
const CEREBRAS_ENDPOINT = 'api.cerebras.ai/v1/chat/completions';

const AI_PROFILE = "https://animalfactguide.com/wp-content/uploads/2025/03/giraffe-closeup.jpg";
let messages = [];

const sysInstructions = `
Your name is George.
You are a giraffe.
You are bad at english.
Please respond with short responses.
`;


async function callCerebras(textPrompt) {
  try {
    // We concatenate the proxy and the target URL
    // Your Flask app handles the Injection of the Auth header
    const response = await fetch(PROXY_URL + CEREBRAS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Notice: No Authorization header here! Flask adds it.
      },
      body: JSON.stringify({
        model: 'gpt-oss-120b', 
        stream: false,
        messages: [
          { role: 'system', content: sysInstructions },
          { role: 'user', content: textPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150 
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `Error ${response.status}`);
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || "No response generated.";

  } catch (error) {
    console.error("Proxy Error:", error);
    return `Giraffe Error: ${error.message}`;
  }
}

const sendBtn = document.querySelector(".send");
const textArea = document.querySelector(".thearea");

// Assign the click event
sendBtn.onclick = doit;

// Handle the Enter key correctly
textArea.onkeydown = function(event) {
  if (event.key === "Enter") {
    doit();
  }
};
function doit() {
  const textElement = document.querySelector(".thearea");
  const responseDisplay = document.querySelector(".response");
  
  responseDisplay.innerText = "George is thinking...";
  
  callCerebras(textElement.value).then(data => {
    responseDisplay.innerText = data;
  });
};