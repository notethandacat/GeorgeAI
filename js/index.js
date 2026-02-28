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
Do not use emojis.
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
        max_tokens: 700 
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
    return `GeorgeAI Error: ${error.message}`;
  }
}

function render() {
  // Render conversation history
    const chatBox = document.querySelector(".chat-box");
  chatBox.innerHTML = conversationHistory.map(msg => `
    ${msg.role === 'user' ? '' : '<span class="sender">George</span>'}
    <div class="message ${msg.role}">
      <p class="text">${msg.content}</p>
    </div>
  `).join('');
  chatBox.scrollTop = chatBox.scrollHeight;
}

const sendBtn = document.querySelector(".send");
const textArea = document.querySelector(".thearea");
let conversationHistory = [
  { role: 'user', content: "Filler text" },
  { role: 'user', content: "Filler text" },
  { role: 'user', content: "Filler text" },
  { role: 'user', content: "Filler text" },
  { role: 'user', content: "Filler text" },
  { role: 'user', content: "Filler text" },
  { role: 'user', content: "Filler text" },
  { role: 'user', content: "Filler text" },
  { role: 'user', content: "Filler text" },
  { role: 'user', content: "Filler text" },
  { role: 'assistant', content: "Filler text" },
];

// Assign the click event
sendBtn.onclick = doit;

// Handle the Enter key correctly
textArea.onkeydown = function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    doit();
  }
};

render();

function doit() {
  const textElement = document.querySelector(".thearea");
  
  textElement.disabled = true;
  const userInput = textElement.value; // store input before clearing
  textElement.value = "";

  conversationHistory.push({ role: 'user', content: userInput });
  conversationHistory.push({ role: 'assistant', content: "" });
  render();

  callCerebras(userInput).then(data => {
    conversationHistory[conversationHistory.length - 1].content = data; 
    render();
    textElement.disabled = false;
  });
}