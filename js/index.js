const PROXY_URL = 'https://ai-write-nine.vercel.app/proxy/';
const CEREBRAS_ENDPOINT = 'api.cerebras.ai/v1/chat/completions';

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

if (hasChatParam && !hasNameParam && !hasInstructionsParam && !hasIconParam) {
    name = "George";
    AI_PROFILE = GEORGE_DEFAULT_PROFILE;
    sysInstructions = GEORGE_DEFAULT_INSTRUCTIONS;
    conversationHistory = [{ role: 'assistant', content: "Welcome to GeorgeAI!", sender: "George" }];
} else if (params.size === 0) {
    name = "George";
    AI_PROFILE = GEORGE_DEFAULT_PROFILE;
    sysInstructions = GEORGE_DEFAULT_INSTRUCTIONS;
    conversationHistory = [{ role: 'assistant', content: "Welcome to GeorgeAI!", sender: "George" }];
} else {
    name = params.get('name') || "Custom Agent";
    sysInstructions = params.get('instructions') || "";
    AI_PROFILE = params.get('icon') || `https://ui-avatars.com/api/?name=${encodeURIComponent(name[0])}`;
    conversationHistory = [{ role: 'assistant', content: "Welcome to GeorgeAI!", sender: name }];
}

if (params.has('chat')) {
    try {
        const encodedData = decodeURIComponent(params.get('chat'));
        const decodedString = safeBase64Decode(encodedData);
        const decodedData = JSON.parse(decodedString);
        conversationHistory = decodedData.messages || [{ role: 'assistant', content: "Welcome to GeorgeAI!" }];
        if (params.has('profile')) {
            AI_PROFILE = decodeURIComponent(params.get('profile'));
        } else {
            AI_PROFILE = name === "George"
                ? GEORGE_DEFAULT_PROFILE
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(name[0])}`;
        }
    } catch (error) {
        console.error("Error decoding shared chat:", error);
        showAlert("Unable to load shared chat. Using default agent.", "error");
        name = "George";
        AI_PROFILE = GEORGE_DEFAULT_PROFILE;
        sysInstructions = GEORGE_DEFAULT_INSTRUCTIONS;
        conversationHistory = [{ role: 'assistant', content: "Welcome to GeorgeAI!" }];
    }
}

function getSysSuffix() {
    return `\n\nYour name is ${name}. You may use Markdown (marked.js, no extensions). You do not have LaTeX capabilities. Always try to use them when appropriate.`;
}

sysInstructions += getSysSuffix();

// Unique session ID — each new conversation gets its own slot in localStorage
let sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

// User's display name, persisted across sessions
let userName = localStorage.getItem('userName') || 'You';

// ===== UI HELPERS =====
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
        modal.removeEventListener('click', handleBg);
    };
    const handleAccept = () => { cleanup(); onConfirm && onConfirm(); };
    const handleCancel = () => { cleanup(); onCancel && onCancel(); };
    const handleBg = e => { if (e.target === modal) handleCancel(); };

    acceptBtn.addEventListener('click', handleAccept);
    cancelBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleBg);
}

function formatDate(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(ts).toLocaleDateString();
}

function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== ENCODING =====
function safeBase64Encode(value) {
    return btoa(
        encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1))
    );
}

function safeBase64Decode(value) {
    const text = atob(value);
    const bytes = Array.prototype.map.call(text, c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('');
    return decodeURIComponent(bytes);
}

// ===== STORAGE =====
function autoSaveChat() {
    const userMsgs = conversationHistory.filter(m => m.role === 'user');
    if (!userMsgs.length) return;

    const saved = JSON.parse(localStorage.getItem('savedChats') || '{}');
    saved[sessionId] = {
        id: sessionId,
        name: userMsgs[0].content.slice(0, 45),
        timestamp: Date.now(),
        agentName: name,
        agentIcon: AI_PROFILE,
        agentInstructions: sysInstructions.replace(getSysSuffix(), ''),
        userName: userName,
        messages: conversationHistory
    };
    localStorage.setItem('savedChats', JSON.stringify(saved));
}

function generateShareableLinkForData(chatData) {
    try {
        const encoded = encodeURIComponent(safeBase64Encode(JSON.stringify({ messages: chatData.messages })));
        const base = window.location.origin + window.location.pathname;
        const p = new URLSearchParams();
        if (chatData.agentName && chatData.agentName !== 'George') p.set('name', chatData.agentName);
        p.set('chat', encoded);
        return `${base}?${p.toString()}`;
    } catch (e) {
        return '';
    }
}

function exportChatDataAsJSON(chatData) {
    const data = {
        agent: { name: chatData.agentName, icon: chatData.agentIcon, instructions: chatData.agentInstructions },
        messages: chatData.messages,
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${(chatData.name || 'export').replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== AI =====
async function callCerebras(apiMessages) {
    try {
        const response = await fetch(PROXY_URL + CEREBRAS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen-3-235b-a22b-instruct-2507',
                messages: [
                    { role: 'system', content: sysInstructions },
                    ...apiMessages
                ],
                temperature: 0.7,
                max_tokens: 8192
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.details || `Error ${response.status}`);
        }
        const result = await response.json();
        return result.choices?.[0]?.message?.content || "No response generated.";
    } catch (error) {
        console.error("Proxy Error:", error);
        showAlert("Proxy request failed. Check your connection or proxy settings.", "error");
        return `Oopsies, I think I popped a brain. Could you help me debug this? Here is some information: ${error.message}`;
    }
}

// ===== RENDER =====
function render() {
    const chatBox = document.querySelector(".chat-box");
    chatBox.innerHTML = conversationHistory.map(msg => {
        let parsedContent = msg.content;
        if (msg.role === "assistant") parsedContent = marked.parse(msg.content);
        const senderLabel = msg.sender || (msg.role === 'user' ? userName : name);
        return `
            ${msg.role === "user" ? '' : '<div class="message">'}
            ${msg.role === "user" ? '' : `<img class="profile" src="${AI_PROFILE}">`}
            <div class="text ${msg.role} ${msg.role === 'user' ? '' : 'markdown-body'}">
                <div class="sender">${senderLabel}</div>
                ${parsedContent}
            </div>
            ${msg.role === "user" ? '' : '</div>'}
        `;
    }).join('');
    chatBox.innerHTML += "<div style='height: 100px;'></div>";
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ===== SEND =====
const sendBtn = document.querySelector(".send");
const textArea = document.querySelector(".thearea");
sendBtn.onclick = doit;
textArea.onkeydown = function(event) {
    if (event.key === "Enter") { event.preventDefault(); doit(); }
};

function setLandingMode(enabled) {
    document.body.classList.toggle('landing', enabled);
}

function updateAgentUI() {
    document.getElementById('welcomeTitle').textContent = `Welcome to ${name}`;
    document.querySelector('.thearea').placeholder = name === 'George'
        ? 'Ask about anything here'
        : `Chat with ${name} here`;
    document.getElementById('userNameInput').value = userName;
}

setLandingMode(!conversationHistory.some(m => m.role === 'user'));
updateAgentUI();
render();

function doit() {
    const textElement = document.querySelector(".thearea");
    const userInput = textElement.value;
    if (!userInput.trim()) return;

    setLandingMode(false);
    textElement.disabled = true;
    textElement.value = "";

    conversationHistory.push({ role: 'user', content: userInput, sender: userName });
    conversationHistory.push({ role: 'assistant', content: "", sender: name });
    render();

    // Build API messages: full history minus the empty placeholder at the end
    const apiMessages = conversationHistory
        .slice(0, -1)
        .map(m => ({ role: m.role, content: m.content }));

    callCerebras(apiMessages).then(data => {
        conversationHistory[conversationHistory.length - 1].content = data;
        render();
        textElement.disabled = false;
        autoSaveChat();
    });
}

document.getElementById("new").onclick = function() {
    window.location.href = "/";
};

// ===== MENU PANEL =====
function openMenu() {
    renderChatList();
    document.getElementById('menuPanel').classList.add('active');
    document.getElementById('menuOverlay').classList.add('active');
}

function closeMenu() {
    document.getElementById('menuPanel').classList.remove('active');
    document.getElementById('menuOverlay').classList.remove('active');
}

function renderChatList() {
    const list = document.getElementById('chatList');
    const saved = JSON.parse(localStorage.getItem('savedChats') || '{}');
    const chats = Object.values(saved).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (!chats.length) {
        list.innerHTML = '<p class="chat-list__empty">No saved chats yet.<br>Start a conversation and it\'ll appear here.</p>';
        return;
    }

    list.innerHTML = chats.map(chat => {
        const id = escapeHtml(chat.id || chat.name);
        return `
            <div class="chat-item" data-id="${id}">
                <div class="chat-item__info">
                    <div class="chat-item__name">${escapeHtml(chat.name || 'Untitled')}</div>
                    <div class="chat-item__meta">${escapeHtml(chat.agentName || 'George')} · ${formatDate(chat.timestamp)}</div>
                </div>
                <div class="chat-item__actions">
                    <button class="chat-item__btn" data-action="share" data-id="${id}" title="Share">&#xe80d;</button>
                    <button class="chat-item__btn danger" data-action="delete" data-id="${id}" title="Delete">&#xe872;</button>
                </div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.chat-item__info').forEach(el => {
        el.onclick = () => loadMenuChat(el.closest('.chat-item').dataset.id);
    });
    list.querySelectorAll('[data-action="share"]').forEach(btn => {
        btn.onclick = e => { e.stopPropagation(); openChatShare(btn.dataset.id); };
    });
    list.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.onclick = e => { e.stopPropagation(); deleteMenuChat(btn.dataset.id); };
    });
}

function loadMenuChat(chatId) {
    const saved = JSON.parse(localStorage.getItem('savedChats') || '{}');
    const chat = saved[chatId];
    if (!chat) return;

    sessionId = chatId;
    name = chat.agentName || 'George';
    AI_PROFILE = chat.agentIcon;
    sysInstructions = (chat.agentInstructions || '') + getSysSuffix();

    // Stamp any missing senders using the names recorded at save time
    const savedUser = chat.userName || 'You';
    const savedAgent = chat.agentName || 'George';
    conversationHistory = chat.messages.map(m => ({
        ...m,
        sender: m.sender || (m.role === 'user' ? savedUser : savedAgent)
    }));

    setLandingMode(!conversationHistory.some(m => m.role === 'user'));
    updateAgentUI();
    render();
    closeMenu();
}

function deleteMenuChat(chatId) {
    const saved = JSON.parse(localStorage.getItem('savedChats') || '{}');
    const label = saved[chatId]?.name || chatId;
    showConfirm(`Delete "${label}"?`, () => {
        delete saved[chatId];
        localStorage.setItem('savedChats', JSON.stringify(saved));
        renderChatList();
        showAlert('Chat deleted', 'success');
    });
}

// ===== PER-CHAT SHARE MODAL =====
let shareTargetId = null;

function openChatShare(chatId) {
    const saved = JSON.parse(localStorage.getItem('savedChats') || '{}');
    const chat = saved[chatId];
    if (!chat) return;
    shareTargetId = chatId;

    const link = generateShareableLinkForData(chat);
    document.getElementById('chatShareLink').value = link;

    const qr = document.getElementById('chatShareQR');
    qr.innerHTML = '';
    if (link) {
        new QRCode(qr, { text: link, width: 160, height: 160, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.H });
    }
    document.getElementById('chatShareModalOverlay').classList.add('active');
}

function closeChatShare() {
    document.getElementById('chatShareModalOverlay').classList.remove('active');
    shareTargetId = null;
}

// ===== SETTINGS =====
function openSettings(tab = 'about') {
    switchSettingsTab(tab);
    document.getElementById('settingsPanel').classList.add('active');
    document.getElementById('settingsOverlay').classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsPanel').classList.remove('active');
    document.getElementById('settingsOverlay').classList.remove('active');
}

function switchSettingsTab(tabName) {
    document.querySelectorAll('.settings-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.settings-section').forEach(section => {
        section.style.display = section.id === `stab-${tabName}` ? 'block' : 'none';
    });
}

// Light mode
const isLightMode = localStorage.getItem('lightMode') === 'true';
if (isLightMode) {
    document.body.classList.add('light-mode');
    document.getElementById('lightModeToggle').checked = true;
}

document.getElementById('lightModeToggle').onchange = function() {
    document.body.classList.toggle('light-mode', this.checked);
    localStorage.setItem('lightMode', this.checked);
};

// ===== EVENT LISTENERS =====
document.getElementById('menuBtn').onclick = openMenu;
document.getElementById('menuClose').onclick = closeMenu;
document.getElementById('menuOverlay').onclick = closeMenu;

document.getElementById('settingsBtn').onclick = () => openSettings();
document.getElementById('settingsClose').onclick = closeSettings;
document.getElementById('settingsOverlay').onclick = closeSettings;

document.querySelectorAll('.settings-tab').forEach(btn => {
    btn.onclick = () => switchSettingsTab(btn.dataset.tab);
});

document.getElementById('chatShareClose').onclick = closeChatShare;
document.getElementById('chatShareModalOverlay').onclick = function(e) {
    if (e.target === this) closeChatShare();
};

document.getElementById('copyChatShareLink').onclick = function() {
    document.getElementById('chatShareLink').select();
    document.execCommand('copy');
    this.textContent = 'Copied!';
    setTimeout(() => { this.textContent = 'Copy'; }, 2000);
};

document.getElementById('downloadChatJSON').onclick = function() {
    if (!shareTargetId) return;
    const saved = JSON.parse(localStorage.getItem('savedChats') || '{}');
    const chat = saved[shareTargetId];
    if (chat) exportChatDataAsJSON(chat);
};

document.getElementById('userNameInput').oninput = function() {
    userName = this.value.trim() || 'You';
    localStorage.setItem('userName', userName);
};

document.getElementById('agentIconInput').onchange = function() {
    const file = this.files[0];
    const area = document.getElementById('fileUploadArea');
    const preview = document.getElementById('agentIconPreview');
    if (file) {
        area.classList.add('has-file');
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}"><span>${escapeHtml(file.name)}</span>`;
            preview.classList.add('visible');
        };
        reader.readAsDataURL(file);
    } else {
        area.classList.remove('has-file');
        preview.classList.remove('visible');
        preview.innerHTML = '';
    }
};

document.getElementById('applyAgent').onclick = function() {
    const newName = document.getElementById('agentNameInput').value.trim();
    const newInstructions = document.getElementById('agentInstructionsInput').value.trim();
    const file = document.getElementById('agentIconInput').files[0];

    const apply = (iconDataUrl) => {
        if (newName) name = newName;
        if (newInstructions) {
            sysInstructions = newInstructions + getSysSuffix();
        }
        if (iconDataUrl) AI_PROFILE = iconDataUrl;

        sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        conversationHistory = [{ role: 'assistant', content: `Welcome to ${name}!` }];
        updateAgentUI();

        document.getElementById('agentIconInput').value = '';
        document.getElementById('fileUploadArea').classList.remove('has-file');
        const preview = document.getElementById('agentIconPreview');
        preview.classList.remove('visible');
        preview.innerHTML = '';

        setLandingMode(true);
        render();
        closeSettings();
        showAlert(`Agent "${name}" applied!`, 'success');
    };

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = canvas.height = 40;
                const sSize = Math.min(img.width, img.height);
                ctx.drawImage(img, (img.width - sSize) / 2, (img.height - sSize) / 2, sSize, sSize, 0, 0, 40, 40);
                apply(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        apply(null);
    }
};
