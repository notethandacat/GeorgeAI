// Your new Flask Proxy URL
const PROXY_URL = 'https://ai-write-nine.vercel.app/proxy/';
// The actual Cerebras endpoint (without the proxy prefix)
const CEREBRAS_ENDPOINT = 'api.cerebras.ai/v1/chat/completions';

// Get URL parameters
const params = new URLSearchParams(window.location.search);
const GEORGE_DEFAULT_PROFILE = "https://animalfactguide.com/wp-content/uploads/2025/03/giraffe-closeup.jpg";
const GEORGE_DEFAULT_INSTRUCTIONS = `
You are a giraffe.
You are bad at english but think you are good at english.
Please respond with short responses.
Use markdown everywhere.
`;

const hasChatParam = params.has('chat');
const hasNameParam = params.has('name');
const hasInstructionsParam = params.has('instructions');
const hasIconParam = params.has('icon');

let name, sysInstructions, AI_PROFILE, conversationHistory;

// 2. Unless if there ISN'T ANYTHING AT ALL, use George
if (hasChatParam && !hasNameParam && !hasInstructionsParam && !hasIconParam) {
    name = "George";
    AI_PROFILE = GEORGE_DEFAULT_PROFILE;
    sysInstructions = GEORGE_DEFAULT_INSTRUCTIONS;
    conversationHistory = [{ role: 'assistant', content: "Welcome to GeorgeAI!" }];
} else if (params.size === 0) {
    name = "George";
    AI_PROFILE = GEORGE_DEFAULT_PROFILE;
    sysInstructions = GEORGE_DEFAULT_INSTRUCTIONS;
    conversationHistory = [{ role: 'assistant', content: "Welcome to GeorgeAI!" }];
} else {
    // 1. If a specific parameter doesn't exist, use Custom Agent defaults
    name = params.get('name') || "Custom Agent";
    sysInstructions = params.get('instructions') || "";
    AI_PROFILE = params.get('icon') || `https://ui-avatars.com/api/?name=${encodeURIComponent(name[0])}`;
    conversationHistory = [{ role: 'assistant', content: "Welcome to GeorgeAI!" }];
}

if (params.has('chat')) {
    // Handle shared chat via encoded URL parameter
    try {
      const encodedData = decodeURIComponent(params.get('chat'));
      const decodedString = safeBase64Decode(encodedData);
      const decodedData = JSON.parse(decodedString);
      conversationHistory = decodedData.messages || [{ role: 'assistant', content: "Welcome to GeorgeAI!" }];
      
      if (params.has('profile')) {
        AI_PROFILE = decodeURIComponent(params.get('profile'));
      } else {
        AI_PROFILE = name === "George"
          ? "https://animalfactguide.com/wp-content/uploads/2025/03/giraffe-closeup.jpg"
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(name[0])}`;
      }
      
      console.log("Loaded shared chat successfully");
    } catch (error) {
      console.error("Error decoding shared chat:", error);
      showAlert("Unable to load shared chat. Using default agent.", "error");
      name = "George";
      AI_PROFILE = "https://animalfactguide.com/wp-content/uploads/2025/03/giraffe-closeup.jpg";
      sysInstructions = `
You are a giraffe.
You are bad at english but think you are good at english.
Please respond with short responses.
Use markdown everywhere.
`;
      conversationHistory = [{ role: 'assistant', content: "Welcome to GeorgeAI!" }];
    }
}
sysInstructions += "\n\nYour name is " + name + ". You may use Markdown (marked.js, no extensions). You do not have LaTeX capabilities. Always try to use them when appropriate.";

// Log for testing
console.log("Name:", name);
console.log("Instructions:", sysInstructions);
console.log("Profile:", AI_PROFILE);

let messages = [];

function showAlert(message, type = 'info', duration = 3500) {
  const container = document.getElementById('alertAgent');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `alert-agent__toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

function showConfirm(message, onConfirm, onCancel) {
  const modal = document.getElementById('confirmModal');
  const messageNode = document.getElementById('confirmMessage');
  const acceptBtn = document.getElementById('confirmAccept');
  const cancelBtn = document.getElementById('confirmCancel');
  if (!modal || !messageNode || !acceptBtn || !cancelBtn) return;

  messageNode.textContent = message;
  modal.classList.add('active');

  const cleanup = () => {
    modal.classList.remove('active');
    acceptBtn.removeEventListener('click', handleAccept);
    cancelBtn.removeEventListener('click', handleCancel);
    modal.removeEventListener('click', handleBackgroundClick);
  };

  const handleAccept = () => {
    cleanup();
    onConfirm && onConfirm();
  };

  const handleCancel = () => {
    cleanup();
    onCancel && onCancel();
  };

  const handleBackgroundClick = event => {
    if (event.target === modal) {
      handleCancel();
    }
  };

  acceptBtn.addEventListener('click', handleAccept);
  cancelBtn.addEventListener('click', handleCancel);
  modal.addEventListener('click', handleBackgroundClick);
}

// ===== STORAGE FUNCTIONS =====
function safeBase64Encode(value) {
  return btoa(
    encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode('0x' + p1);
    })
  );
}

function safeBase64Decode(value) {
  const text = atob(value);
  const bytes = Array.prototype.map.call(text, function(char) {
    return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
  }).join('');
  return decodeURIComponent(bytes);
}

function generateShareableLink() {
  console.log("Generating share link with conversation history:", conversationHistory);
  
  const chatData = {
    messages: conversationHistory
  };
  
  console.log("Share data:", chatData);
  
  try {
    const jsonString = JSON.stringify(chatData);
    const encoded = safeBase64Encode(jsonString);
    const encodedParam = encodeURIComponent(encoded);
    const baseUrl = window.location.origin + window.location.pathname;
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.delete('chat');
    currentParams.set('chat', encodedParam);
    const finalLink = `${baseUrl}?${currentParams.toString()}`;
    
    console.log("Generated share link:", finalLink);
    return finalLink;
  } catch (error) {
    console.error("Error generating shareable link:", error);
    showAlert("Unable to generate share link.", "error");
    return "";
  }
}

function saveCurrentChat(chatName) {
  if (!chatName || chatName.trim() === "") {
    showAlert("Please enter a chat name!", "error");
    return;
  }
  
  const chatData = {
    name: chatName,
    timestamp: Date.now(),
    agentName: name,
    agentIcon: AI_PROFILE,
    agentInstructions: sysInstructions.replace("\n\nYour name is " + name + ". You may use Markdown (marked.js, no extensions). You do not have LaTeX capabilities. Always try to use them when appropriate.", ""),
    messages: conversationHistory
  };
  
  let savedChats = JSON.parse(localStorage.getItem('savedChats') || '{}');
  savedChats[chatName] = chatData;
  localStorage.setItem('savedChats', JSON.stringify(savedChats));
  
  updateSavedChatsList();
  showAlert(`Chat "${chatName}" saved successfully!`, "success");
  document.getElementById('chatName').value = '';
}

function loadSavedChat(chatName) {
  let savedChats = JSON.parse(localStorage.getItem('savedChats') || '{}');
  
  if (savedChats[chatName]) {
    const chatData = savedChats[chatName];
    name = chatData.agentName;
    AI_PROFILE = chatData.agentIcon;
    sysInstructions = chatData.agentInstructions + "\n\nYour name is " + name + ". You may use Markdown (marked.js, no extensions). You do not have LaTeX capabilities. Always try to use them when appropriate.";
    conversationHistory = chatData.messages;
    render();
    closeShareModal();
  } else {
    showAlert("Chat not found!", "error");
  }
}

function deleteChat(chatName) {
  if (!chatName || chatName === "") {
    showAlert("Please select a chat to delete!", "error");
    return;
  }
  
  showConfirm(`Delete chat "${chatName}"?`, () => {
    let savedChats = JSON.parse(localStorage.getItem('savedChats') || '{}');
    delete savedChats[chatName];
    localStorage.setItem('savedChats', JSON.stringify(savedChats));
    updateSavedChatsList();
    showAlert(`Chat "${chatName}" deleted!`, "success");
  });
}

function updateSavedChatsList() {
  const select = document.getElementById('savedChats');
  const savedChats = JSON.parse(localStorage.getItem('savedChats') || '{}');
  
  // Clear existing options except the first one
  select.innerHTML = '<option value="">-- No saved chats --</option>';
  
  Object.keys(savedChats).forEach(chatName => {
    const option = document.createElement('option');
    option.value = chatName;
    option.textContent = chatName;
    select.appendChild(option);
  });
}

function exportChatAsJSON() {
  const data = {
    agent: {
      name: name,
      icon: AI_PROFILE,
      instructions: sysInstructions.replace("\n\nYour name is " + name + ". You may use Markdown (marked.js, no extensions). You do not have LaTeX capabilities. Always try to use them when appropriate.", "")
    },
    messages: conversationHistory,
    exportedAt: new Date().toISOString()
  };
  
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chat-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

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
    showAlert("Proxy request failed. Check your connection or proxy settings.", "error");
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
    autoSaveChat(); // Auto-save after each message
  });
}

document.getElementById("new").onclick = function() {
  window.location.href = "/";
}

// ===== SHARE MODAL FUNCTIONS =====
function openShareModal() {
  document.getElementById('shareModal').style.display = 'block';
  updateSavedChatsList();
  updateShareLink();
}

function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
}

function updateShareLink() {
  const shareLink = generateShareableLink();
  const shareInput = document.getElementById('shareLink');
  shareInput.value = shareLink || '';
  
  // Generate QR Code
  const qrContainer = document.getElementById('qrCode');
  qrContainer.innerHTML = ''; // Clear previous QR code
  
  if (shareLink) {
    new QRCode(qrContainer, {
      text: shareLink,
      width: 180,
      height: 180,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    qrContainer.textContent = 'Unable to generate link';
  }
}

// Auto-save conversation to localStorage periodically
let autoSaveCounter = 0;
function autoSaveChat() {
  autoSaveCounter++;
  // Save every 5 messages
  if (autoSaveCounter >= 5) {
    const autoSaveData = {
      timestamp: Date.now(),
      agentName: name,
      agentIcon: AI_PROFILE,
      agentInstructions: sysInstructions.replace("\n\nYour name is " + name + ". You may use Markdown (marked.js, no extensions). You do not have LaTeX capabilities. Always try to use them when appropriate.", ""),
      messages: conversationHistory
    };
    localStorage.setItem('autosave', JSON.stringify(autoSaveData));
    autoSaveCounter = 0;
  }
}

// ===== EVENT LISTENERS =====
document.getElementById('share').onclick = openShareModal;

const closeBtn = document.querySelector('.close');
closeBtn.onclick = closeShareModal;

window.onclick = function(event) {
  const modal = document.getElementById('shareModal');
  if (event.target == modal) {
    closeShareModal();
  }
}

document.getElementById('copyShareLink').onclick = function() {
  const shareLink = document.getElementById('shareLink');
  shareLink.select();
  document.execCommand('copy');
  this.textContent = 'Copied!';
  setTimeout(() => {
    this.textContent = 'Copy Link';
  }, 2000);
}

document.getElementById('exportChat').onclick = exportChatAsJSON;

document.getElementById('saveChat').onclick = function() {
  const chatName = document.getElementById('chatName').value;
  saveCurrentChat(chatName);
}

document.getElementById('loadChat').onclick = function() {
  const chatName = document.getElementById('savedChats').value;
  loadSavedChat(chatName);
}

document.getElementById('deleteChat').onclick = function() {
  const chatName = document.getElementById('savedChats').value;
  deleteChat(chatName);
}