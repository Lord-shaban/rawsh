// ============================================
// iCHAT — Authentication / Login Logic
// ============================================

const AUTH_STORAGE_KEY = 'ichat_user';

// Get current user from localStorage
function getCurrentUser() {
    try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

// Save user to localStorage
function saveUser(user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

// Clear user from localStorage
function clearUser() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Generate a simple unique ID
function generateUserId() {
    return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

// Validate screen name
function validateScreenName(name) {
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Please enter a screen name!' };
    }
    if (name.trim().length < APP_CONFIG.minScreenNameLength) {
        return { valid: false, error: `Screen name must be at least ${APP_CONFIG.minScreenNameLength} characters!` };
    }
    if (name.trim().length > APP_CONFIG.maxScreenNameLength) {
        return { valid: false, error: `Screen name must be ${APP_CONFIG.maxScreenNameLength} characters or less!` };
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(name.trim())) {
        return { valid: false, error: 'Only letters, numbers, _ and - allowed!' };
    }
    return { valid: true, error: null };
}

// Initialize login page
function initLoginPage() {
    // Check if already logged in
    const existingUser = getCurrentUser();
    if (existingUser) {
        window.location.href = 'lobby.html';
        return;
    }

    // Initialize Supabase
    initSupabase();

    // Setup avatar grid
    renderAvatarGrid();

    // Setup color grid
    renderColorGrid();

    // Setup screen name input
    setupScreenNameInput();

    // Setup form submission
    setupLoginForm();

    // Update preview
    updatePreview();
}

// State
let selectedAvatar = AVATARS[0];
let selectedColor = TEXT_COLORS[0];

// Render avatar selection grid
function renderAvatarGrid() {
    const grid = document.getElementById('avatar-grid');
    if (!grid) return;

    grid.innerHTML = AVATARS.map((avatar, index) => `
        <div class="avatar-option ${index === 0 ? 'selected' : ''}" 
             data-avatar-id="${avatar.id}" 
             onclick="selectAvatar('${avatar.id}')">
            <span class="avatar-option-icon">${avatar.emoji}</span>
            <span class="avatar-option-name">${avatar.name}</span>
        </div>
    `).join('');
}

// Select an avatar
function selectAvatar(avatarId) {
    selectedAvatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

    document.querySelectorAll('.avatar-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.avatarId === avatarId);
    });

    updatePreview();
    playClickSound();
}

// Render color grid
function renderColorGrid() {
    const grid = document.getElementById('color-grid');
    if (!grid) return;

    grid.innerHTML = TEXT_COLORS.map((color, index) => `
        <div class="color-option ${index === 0 ? 'selected' : ''}" 
             style="background: ${color}" 
             data-color="${color}"
             onclick="selectColor('${color}')"
             title="${color}">
        </div>
    `).join('');
}

// Select a color
function selectColor(color) {
    selectedColor = color;

    document.querySelectorAll('.color-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.color === color);
    });

    updatePreview();
    playClickSound();
}

// Setup screen name input
function setupScreenNameInput() {
    const input = document.getElementById('screen-name-input');
    const charCount = document.getElementById('char-count');
    if (!input) return;

    input.addEventListener('input', () => {
        const len = input.value.length;
        if (charCount) {
            charCount.textContent = `${len}/${APP_CONFIG.maxScreenNameLength}`;
        }
        updatePreview();
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    // Auto-focus
    setTimeout(() => input.focus(), 300);
}

// Update preview message
function updatePreview() {
    const input = document.getElementById('screen-name-input');
    const previewName = document.getElementById('preview-username');
    const previewText = document.getElementById('preview-text');

    if (!previewName || !input) return;

    const name = input.value.trim() || 'YourName';
    previewName.textContent = `<${name}>`;
    previewName.style.color = selectedColor;
    if (previewText) {
        previewText.textContent = ' Hello, World! Welcome to iCHAT! 🖥️';
    }
}

// Setup login form
function setupLoginForm() {
    const form = document.getElementById('login-form');
    const connectBtn = document.getElementById('connect-btn');

    if (connectBtn) {
        connectBtn.addEventListener('click', handleLogin);
    }
}

// Handle login
async function handleLogin() {
    const input = document.getElementById('screen-name-input');
    const errorEl = document.getElementById('login-error');
    const formEl = document.getElementById('login-form');
    const loadingEl = document.getElementById('login-loading');

    if (!input) return;

    const screenName = input.value.trim();
    const validation = validateScreenName(screenName);

    if (!validation.valid) {
        if (errorEl) {
            errorEl.textContent = validation.error;
            errorEl.style.display = 'block';
        }
        shakeElement(input);
        return;
    }

    // Clear error
    if (errorEl) errorEl.textContent = '';

    // Show loading
    if (formEl) formEl.classList.add('hidden');
    if (loadingEl) loadingEl.classList.add('visible');

    // Create user object
    const user = {
        id: generateUserId(),
        screenName: screenName,
        avatar: selectedAvatar.id,
        avatarEmoji: selectedAvatar.emoji,
        textColor: selectedColor,
        status: 'online',
        awayMessage: '',
        createdAt: new Date().toISOString()
    };

    // Try to save to Supabase
    const { error } = await dbCreateUser(user);

    if (error) {
        console.error('DB Error:', error);
        // If screen name taken
        if (error.code === '23505') {
            if (formEl) formEl.classList.remove('hidden');
            if (loadingEl) loadingEl.classList.remove('visible');
            if (errorEl) {
                errorEl.textContent = 'Screen name already taken! Try another one.';
                errorEl.style.display = 'block';
            }
            return;
        }
    }

    // Save locally
    saveUser(user);

    // Simulate dial-up connection delay for retro effect
    await simulateDialup(loadingEl);

    // Redirect to lobby
    window.location.href = 'lobby.html';
}

// Simulate dial-up connection
async function simulateDialup(loadingEl) {
    const messages = [
        'Initializing modem...',
        'Dialing... ATDT 555-0199',
        'Connecting at 56000 bps...',
        'Negotiating protocol...',
        'Authenticating...',
        'CONNECTED! ✓'
    ];

    const loadingText = loadingEl?.querySelector('.login-loading-text');
    const progressFill = loadingEl?.querySelector('.win95-progress-fill');

    for (let i = 0; i < messages.length; i++) {
        if (loadingText) loadingText.textContent = messages[i];
        if (progressFill) progressFill.style.width = `${((i + 1) / messages.length) * 100}%`;
        await sleep(400 + Math.random() * 300);
    }

    await sleep(300);
}

// Utility: sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility: shake element (for validation errors)
function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // Trigger reflow
    el.style.animation = 'shake 0.3s ease';
}

// Placeholder for sound (will be replaced by sounds.js)
function playClickSound() {
    if (typeof SoundManager !== 'undefined' && SoundManager.playClick) {
        SoundManager.playClick();
    }
}

// Add shake animation CSS dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        50% { transform: translateX(5px); }
        75% { transform: translateX(-3px); }
    }
`;
document.head.appendChild(shakeStyle);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initLoginPage);
