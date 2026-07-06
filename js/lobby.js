// ============================================
// iCHAT — Lobby Logic
// ============================================

let lobbyUser = null;
let selectedRoom = 'general';

async function initLobbyPage() {
    lobbyUser = getCurrentUser();
    if (!lobbyUser) {
        window.location.href = 'index.html';
        return;
    }

    initSupabase();
    Settings.init();

    // Render room list
    renderRoomList();

    // Display user info
    displayUserInfo();

    // Setup marquee
    setupMarquee();

    // Setup visitor counter
    await setupVisitorCounter();

    // Start clock
    RetroClock.start('taskbar-clock');

    // Setup join button
    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', joinSelectedRoom);
    }

    // Setup logout
    const logoutBtn = document.getElementById('btn-lobby-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearUser();
            window.location.href = 'index.html';
        });
    }
}

// ─── Render Room List ───
function renderRoomList() {
    const list = document.getElementById('room-list');
    if (!list) return;

    list.innerHTML = CHAT_ROOMS.map(room => `
        <div class="room-item ${room.id === selectedRoom ? 'selected' : ''}" 
             data-room-id="${room.id}"
             onclick="selectRoom('${room.id}')"
             ondblclick="joinRoom('${room.id}')">
            <span class="room-item-icon">${room.icon}</span>
            <div class="room-item-info">
                <div class="room-item-name">${room.name}</div>
                <div class="room-item-desc">${room.description}</div>
            </div>
            <div class="room-item-count">
                <span>👥</span>
                <span id="room-count-${room.id}">-</span>
            </div>
        </div>
    `).join('');
}

// ─── Select a Room ───
function selectRoom(roomId) {
    selectedRoom = roomId;
    document.querySelectorAll('.room-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.roomId === roomId);
    });
    SoundManager.playClick();
}

// ─── Join a Room ───
function joinRoom(roomId) {
    window.location.href = `chat.html?room=${roomId}`;
}

function joinSelectedRoom() {
    if (selectedRoom) {
        joinRoom(selectedRoom);
    }
}

// ─── Display User Info ───
function displayUserInfo() {
    const avatar = document.getElementById('lobby-user-avatar');
    const name = document.getElementById('lobby-user-name');
    const color = document.getElementById('lobby-user-color');

    if (avatar) {
        const avatarData = AVATARS.find(a => a.id === lobbyUser.avatar);
        avatar.textContent = avatarData ? avatarData.emoji : '👤';
    }
    if (name) name.textContent = lobbyUser.screenName;
    if (color) color.style.color = lobbyUser.textColor;
}

// ─── Setup Marquee ───
function setupMarquee() {
    const marqueeContent = document.getElementById('marquee-content');
    if (!marqueeContent) return;

    const randomMsg = MARQUEE_MESSAGES[Math.floor(Math.random() * MARQUEE_MESSAGES.length)];
    const repeated = `${randomMsg}     ✦     ${randomMsg}     ✦     `;
    marqueeContent.textContent = repeated;
}

// ─── Setup Visitor Counter ───
async function setupVisitorCounter() {
    const count = await dbIncrementVisitor();
    const counterEl = document.getElementById('visitor-counter');
    if (!counterEl) return;

    const digits = String(count).padStart(6, '0');
    counterEl.innerHTML = digits.split('').map(d =>
        `<span class="visitor-counter-digit">${d}</span>`
    ).join('');
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', initLobbyPage);
