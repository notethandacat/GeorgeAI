// Your new Flask Proxy URL
const PROXY_URL = 'https://ai-write-nine.vercel.app/proxy/';
// The actual Cerebras endpoint (without the proxy prefix)
const CEREBRAS_ENDPOINT = 'api.cerebras.ai/v1/chat/completions';

// Get URL parameters
const params = new URLSearchParams(window.location.search);

let name, sysInstructions, AI_PROFILE;

// 2. Unless if there ISN'T ANYTHING AT ALL, use George
if (params.size === 0) {
    name = "George";
    AI_PROFILE = "https://animalfactguide.com/wp-content/uploads/2025/03/giraffe-closeup.jpg";
    sysInstructions = `
You are a giraffe.
You are bad at english but think you are good at english.
Please respond with short responses.
Use markdown everywhere.
`;
} else {
    // 1. If a specific parameter doesn't exist, use Custom Agent defaults
    name = params.get('name') || "Custom Agent";
    sysInstructions = params.get('instructions') || "";
    AI_PROFILE = params.get('icon') || `https://ui-avatars.com/api/?name=${encodeURIComponent(name[0])}`;
}
sysInstructions += "\n\nYour name is " + name + ". You may use Markdown (marked.js, no extensions). You do not have LaTeX capabilities. Always try to use them when appropriate.";

// Log for testing
console.log("Name:", name);
console.log("Instructions:", sysInstructions);
console.log("Profile:", AI_PROFILE);

let messages = [];

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
        model: 'qwen-3-235b-a22b-instruct-2507', 
        stream: false,
        messages: [
          { role: 'system', content: sysInstructions },
          { role: 'user', content: textPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500 
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
    return `Oopsies, I think I popped a brain. Could you help me debug this? Here is some information: ${error.message}`;
  }
}

function render() {
  const chatBox = document.querySelector(".chat-box");
  chatBox.innerHTML = conversationHistory.map(msg => {
    // 1. Parse the markdown content into HTML
    // We use marked.parse() which is available globally via UMD
    let parsedContent = msg.content;
    if (msg.role === "assistant") parsedContent = marked.parse(msg.content);
    return `
      ${msg.role === "user" ? '' : '<div class="message">'}
      ${msg.role === "user" ? '' : '<img class="profile" src='+AI_PROFILE+'>'}
        <div class="text ${msg.role} ${msg.role == 'user' ? '' : 'markdown-body'}">${parsedContent}</div>
      ${msg.role === "user" ? '' : '</div>'}
    `;
  }).join('');
  chatBox.innerHTML += "<div style='height: 100px;'></div>"
  chatBox.scrollTop = chatBox.scrollHeight;
}

const sendBtn = document.querySelector(".send");
const textArea = document.querySelector(".thearea");
let conversationHistory = [
  { role: 'assistant', content: "Welcome to GeorgeAI!" },
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

document.getElementById("new").onclick = function() {
  window.location.href = "/";
}