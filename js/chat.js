// ============================================
// iCHAT — Main Chat Logic
// ============================================

let currentUser = null;
let currentRoomId = null;
let currentRoomInfo = null;

// ─── Initialize Chat Page ───
async function initChatPage() {
    currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Get room from URL
    const params = new URLSearchParams(window.location.search);
    currentRoomId = params.get('room') || 'general';
    currentRoomInfo = CHAT_ROOMS.find(r => r.id === currentRoomId) || CHAT_ROOMS[0];

    // Initialize Supabase
    initSupabase();

    // Apply settings
    Settings.init();

    // Update UI with room info
    updateRoomUI();

    // Setup input
    setupChatInput();

    // Setup toolbar buttons
    setupToolbar();

    // Load message history
    await loadHistory();

    // Join realtime room
    await Realtime.joinRoom(currentRoomId, currentUser, {
        onMessage: handleIncomingMessage,
        onUserJoin: handleUserJoin,
        onUserLeave: handleUserLeave,
        onPresenceSync: handlePresenceSync,
        onTyping: handleTypingIndicator,
    });

    // Add system message
    addSystemMessage(`You joined ${currentRoomInfo.name}`);

    // Start clock
    RetroClock.start('taskbar-clock');

    // Focus input
    const input = document.getElementById('chat-input');
    if (input) input.focus();

    // Handle page unload
    window.addEventListener('beforeunload', handleLeave);
}

// ─── Update Room UI ───
function updateRoomUI() {
    const titleText = document.getElementById('chat-title-text');
    const roomName = document.getElementById('room-info-name');
    const roomDesc = document.getElementById('room-info-desc');

    if (titleText) titleText.textContent = `iCHAT — ${currentRoomInfo.name}`;
    if (roomName) roomName.textContent = currentRoomInfo.name;
    if (roomDesc) roomDesc.textContent = currentRoomInfo.description;

    document.title = `iCHAT — ${currentRoomInfo.name}`;
}

// ─── Setup Chat Input ───
function setupChatInput() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const charCount = document.getElementById('chat-char-count');

    if (!input) return;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    input.addEventListener('input', () => {
        if (charCount) {
            charCount.textContent = `${input.value.length}/${APP_CONFIG.maxMessageLength}`;
        }
        // Send typing indicator
        Realtime.sendTyping(currentUser.id, currentUser.screenName);
    });

    if (sendBtn) {
        sendBtn.addEventListener('click', handleSendMessage);
    }
}

// ─── Handle Send Message ───
function handleSendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;
    if (text.length > APP_CONFIG.maxMessageLength) return;

    // Check for commands
    if (ChatCommands.isCommand(text)) {
        const result = ChatCommands.execute(text, {
            screenName: currentUser.screenName,
            userId: currentUser.id,
        });

        if (result) {
            handleCommandResult(result);
        }

        input.value = '';
        updateCharCount();
        return;
    }

    // Send regular message
    const messageData = {
        roomId: currentRoomId,
        userId: currentUser.id,
        screenName: currentUser.screenName,
        avatar: currentUser.avatarEmoji,
        content: text,
        textColor: currentUser.textColor,
        type: 'message',
    };

    Realtime.sendMessage(messageData);
    input.value = '';
    updateCharCount();
}

// ─── Handle Command Result ───
function handleCommandResult(result) {
    switch (result.type) {
        case 'error':
            addSystemMessage(`⚠️ ${result.content}`);
            SoundManager.playError();
            break;

        case 'system':
            addSystemMessage(result.content);
            if (result.colorChange) {
                currentUser.textColor = result.colorChange;
            }
            break;

        case 'help':
            addHelpMessage(result.content);
            break;

        case 'action':
            Realtime.sendMessage({
                roomId: currentRoomId,
                userId: currentUser.id,
                screenName: currentUser.screenName,
                avatar: currentUser.avatarEmoji,
                content: result.content,
                textColor: currentUser.textColor,
                type: 'action',
            });
            break;

        case 'roll':
            Realtime.sendMessage({
                roomId: currentRoomId,
                userId: currentUser.id,
                screenName: currentUser.screenName,
                avatar: currentUser.avatarEmoji,
                content: result.content,
                textColor: currentUser.textColor,
                type: 'roll',
            });
            break;

        case 'message':
            Realtime.sendMessage({
                roomId: currentRoomId,
                userId: currentUser.id,
                screenName: currentUser.screenName,
                avatar: currentUser.avatarEmoji,
                content: result.content,
                textColor: currentUser.textColor,
                type: 'message',
            });
            break;

        case 'status':
            Realtime.updateStatus(result.status, result.awayMessage || '');
            Realtime.sendMessage({
                roomId: currentRoomId,
                userId: currentUser.id,
                screenName: currentUser.screenName,
                avatar: currentUser.avatarEmoji,
                content: result.content,
                textColor: currentUser.textColor,
                type: 'system',
            });
            break;

        case 'whisper':
            handleWhisperSend(result.target, result.content);
            break;

        case 'userlist':
            showUserList();
            break;
    }
}

// ─── Handle Incoming Message ───
function handleIncomingMessage(data) {
    switch (data.type) {
        case 'message':
            addChatMessage(data);
            if (data.userId !== currentUser.id) {
                SoundManager.playMessage();
            }
            break;

        case 'action':
            addActionMessage(data);
            if (data.userId !== currentUser.id) {
                SoundManager.playMessage();
            }
            break;

        case 'system':
            addSystemMessage(data.content);
            break;

        case 'roll':
            addRollMessage(data);
            if (data.userId !== currentUser.id) {
                SoundManager.playMessage();
            }
            break;

        case 'whisper':
            if (data.targetId === currentUser.id) {
                addWhisperMessage(data, false);
                SoundManager.playWhisper();
            }
            break;
    }
}

// ─── Handle User Join ───
function handleUserJoin(user) {
    addSystemMessage(`→ ${user.screenName} has entered the room`);
    SoundManager.playUserJoin();
}

// ─── Handle User Leave ───
function handleUserLeave(user) {
    addSystemMessage(`← ${user.screenName} has left the room`);
    SoundManager.playUserLeave();
}

// ─── Handle Presence Sync ───
function handlePresenceSync(users) {
    renderBuddyList(users);
}

// ─── Handle Typing Indicator ───
let typingClearTimeout = null;
function handleTypingIndicator(data) {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;

    indicator.textContent = `${data.screenName} is typing...`;

    clearTimeout(typingClearTimeout);
    typingClearTimeout = setTimeout(() => {
        indicator.textContent = '';
    }, APP_CONFIG.typingTimeout);
}

// ─── Add Chat Message to DOM ───
function addChatMessage(data) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    const timeStr = formatTime(timestamp);
    const processedContent = EmojiParser.process(data.content);

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg msg-enter';
    msgEl.innerHTML = `
        <span class="chat-msg-time">[${timeStr}] </span>
        <span class="chat-msg-user" style="color: ${data.textColor || '#00FF41'}" 
              onclick="startWhisper('${data.screenName}')" 
              title="Click to whisper">&lt;${EmojiParser.escapeHtml(data.screenName)}&gt;</span>
        <span class="chat-msg-text"> ${processedContent}</span>
    `;

    container.appendChild(msgEl);
    scrollToBottom(container);
}

// ─── Add System Message ───
function addSystemMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const timeStr = RetroClock.getTimestamp();

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg system msg-enter';
    msgEl.innerHTML = `
        <span class="chat-msg-time">[${timeStr}] </span>
        <span class="chat-msg-text">*** ${EmojiParser.escapeHtml(text)} ***</span>
    `;

    container.appendChild(msgEl);
    scrollToBottom(container);
}

// ─── Add Action Message (/me) ───
function addActionMessage(data) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const timeStr = data.timestamp ? formatTime(new Date(data.timestamp)) : RetroClock.getTimestamp();
    const processedContent = EmojiParser.process(data.content);

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg action msg-enter';
    msgEl.innerHTML = `
        <span class="chat-msg-time">[${timeStr}] </span>
        <span class="chat-msg-text" style="color: ${data.textColor || '#00FF41'}">
            * ${EmojiParser.escapeHtml(data.screenName)} ${processedContent}
        </span>
    `;

    container.appendChild(msgEl);
    scrollToBottom(container);
}

// ─── Add Roll Message ───
function addRollMessage(data) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const timeStr = data.timestamp ? formatTime(new Date(data.timestamp)) : RetroClock.getTimestamp();

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg roll msg-enter';
    msgEl.innerHTML = `
        <span class="chat-msg-time">[${timeStr}] </span>
        <span class="chat-msg-text">${EmojiParser.process(data.content)}</span>
    `;

    container.appendChild(msgEl);
    scrollToBottom(container);
}

// ─── Add Help Message ───
function addHelpMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg system msg-enter';
    msgEl.style.whiteSpace = 'pre';
    msgEl.style.color = 'var(--neon-cyan)';
    msgEl.innerHTML = `<span class="chat-msg-text" style="color: var(--neon-cyan)">${EmojiParser.escapeHtml(text)}</span>`;

    container.appendChild(msgEl);
    scrollToBottom(container);
}

// ─── Add Whisper Message ───
function addWhisperMessage(data, sent) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const timeStr = data.timestamp ? formatTime(new Date(data.timestamp)) : RetroClock.getTimestamp();
    const prefix = sent ? `[whisper to ${data.targetName}]` : `[whisper from ${data.screenName}]`;

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg whisper msg-enter';
    msgEl.innerHTML = `
        <span class="chat-msg-time">[${timeStr}] </span>
        <span class="chat-msg-user" style="color: var(--neon-purple)">${prefix}</span>
        <span class="chat-msg-text" style="color: var(--neon-purple)"> ${EmojiParser.process(data.content)}</span>
    `;

    container.appendChild(msgEl);
    scrollToBottom(container);
}

// ─── Handle Whisper Send ───
function handleWhisperSend(targetName, content) {
    const users = Realtime.getOnlineUsers();
    const target = users.find(u => u.screenName.toLowerCase() === targetName.toLowerCase());

    if (!target) {
        addSystemMessage(`User "${targetName}" not found or offline.`);
        SoundManager.playError();
        return;
    }

    const data = {
        roomId: currentRoomId,
        userId: currentUser.id,
        screenName: currentUser.screenName,
        targetId: target.id,
        targetName: target.screenName,
        content: content,
        textColor: currentUser.textColor,
        type: 'whisper',
    };

    Realtime.sendMessage(data);
    addWhisperMessage(data, true);
    SoundManager.playWhisper();
}

// ─── Start Whisper (from clicking username) ───
function startWhisper(screenName) {
    if (screenName === currentUser.screenName) return;
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = `/whisper ${screenName} `;
        input.focus();
    }
}

// ─── Show User List ───
function showUserList() {
    const users = Realtime.getOnlineUsers();
    const lines = [`═══ Online Users (${users.length}) ═══`];
    users.forEach(u => {
        const statusIcon = u.status === 'online' ? '🟢' : u.status === 'away' ? '🟡' : '🔴';
        lines.push(`  ${statusIcon} ${u.avatar || ''} ${u.screenName}`);
    });
    lines.push('══════════════════════════');
    addHelpMessage(lines.join('\n'));
}

// ─── Render Buddy List ───
function renderBuddyList(users) {
    const content = document.getElementById('buddy-list-content');
    const countEl = document.getElementById('buddy-count');
    if (!content) return;

    const online = users.filter(u => u.status === 'online');
    const away = users.filter(u => u.status === 'away');
    const busy = users.filter(u => u.status === 'busy');

    let html = '';

    if (online.length > 0) {
        html += `<div class="buddy-list-section">
            <div class="buddy-list-section-title">Online (${online.length})</div>
            ${online.map(u => buddyItemHTML(u, 'online')).join('')}
        </div>`;
    }

    if (away.length > 0) {
        html += `<div class="buddy-list-section">
            <div class="buddy-list-section-title">Away (${away.length})</div>
            ${away.map(u => buddyItemHTML(u, 'away')).join('')}
        </div>`;
    }

    if (busy.length > 0) {
        html += `<div class="buddy-list-section">
            <div class="buddy-list-section-title">Busy (${busy.length})</div>
            ${busy.map(u => buddyItemHTML(u, 'busy')).join('')}
        </div>`;
    }

    content.innerHTML = html;
    if (countEl) countEl.textContent = `${users.length} user${users.length !== 1 ? 's' : ''} online`;
}

function buddyItemHTML(user, status) {
    const isMe = user.id === currentUser?.id;
    return `
        <div class="buddy-item ${isMe ? 'me' : ''}" onclick="startWhisper('${user.screenName}')" 
             title="${user.awayMessage || user.screenName}">
            <span class="buddy-item-status ${status}"></span>
            <span class="buddy-item-avatar">${user.avatar || '👤'}</span>
            <span class="buddy-item-name">${EmojiParser.escapeHtml(user.screenName)}${isMe ? ' (you)' : ''}</span>
        </div>
    `;
}

// ─── Load Message History ───
async function loadHistory() {
    const { data: messages, error } = await dbLoadMessages(currentRoomId);

    if (error) {
        console.error('Failed to load history:', error);
        return;
    }

    messages.forEach(msg => {
        if (msg.type === 'action') {
            addActionMessage(msg);
        } else if (msg.type === 'system') {
            addSystemMessage(msg.content);
        } else if (msg.type === 'roll') {
            addRollMessage(msg);
        } else {
            addChatMessage({
                ...msg,
                timestamp: msg.created_at,
                textColor: msg.text_color,
                screenName: msg.screen_name,
                userId: msg.user_id,
            });
        }
    });
}

// ─── Setup Toolbar ───
function setupToolbar() {
    // Sound toggle
    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
        updateSoundButton();
        soundBtn.addEventListener('click', () => {
            const enabled = !SoundManager.isEnabled();
            Settings.set('soundEnabled', enabled);
            updateSoundButton();
            SoundManager.playClick();
        });
    }

    // CRT toggle
    const crtBtn = document.getElementById('btn-crt');
    if (crtBtn) {
        crtBtn.addEventListener('click', () => {
            const enabled = !Settings.get('crtEnabled');
            Settings.set('crtEnabled', enabled);
            crtBtn.classList.toggle('active', enabled);
            SoundManager.playClick();
        });
    }

    // Settings button
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', toggleSettingsPanel);
    }

    // Back to lobby
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            handleLeave();
            window.location.href = 'lobby.html';
        });
    }

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            handleLeave();
            clearUser();
            window.location.href = 'index.html';
        });
    }
}

function updateSoundButton() {
    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
        soundBtn.textContent = SoundManager.isEnabled() ? '🔊 Sound' : '🔇 Muted';
        soundBtn.classList.toggle('active', SoundManager.isEnabled());
    }
}

// ─── Settings Panel ───
function toggleSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;

    const isVisible = panel.classList.contains('visible');
    panel.classList.toggle('visible', !isVisible);
    SoundManager.playClick();

    if (!isVisible) {
        // Populate settings
        const settings = Settings.load();
        const crtCheck = document.getElementById('setting-crt');
        const soundCheck = document.getElementById('setting-sound');
        const fontSelect = document.getElementById('setting-font-size');

        if (crtCheck) crtCheck.checked = settings.crtEnabled;
        if (soundCheck) soundCheck.checked = settings.soundEnabled;
        if (fontSelect) fontSelect.value = settings.fontSize;
    }
}

function saveSettings() {
    const crtCheck = document.getElementById('setting-crt');
    const soundCheck = document.getElementById('setting-sound');
    const fontSelect = document.getElementById('setting-font-size');

    if (crtCheck) Settings.set('crtEnabled', crtCheck.checked);
    if (soundCheck) Settings.set('soundEnabled', soundCheck.checked);
    if (fontSelect) Settings.set('fontSize', fontSelect.value);

    updateSoundButton();
    toggleSettingsPanel();
}

// ─── Handle Page Leave ───
function handleLeave() {
    Realtime.leaveRoom();
    if (currentUser) {
        dbUpdateUserStatus(currentUser.id, 'offline');
    }
}

// ─── Utilities ───
function scrollToBottom(container) {
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

function formatTime(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        return RetroClock.getTimestamp();
    }
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function updateCharCount() {
    const input = document.getElementById('chat-input');
    const charCount = document.getElementById('chat-char-count');
    if (input && charCount) {
        charCount.textContent = `${input.value.length}/${APP_CONFIG.maxMessageLength}`;
    }
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', initChatPage);
