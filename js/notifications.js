/* ============================================
   iCHAT — Notifications Manager
   ============================================ */

const NotificationsManager = {
  soundEnabled: true,

  // ── Show Toast ────────────────────────────
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    const icons = {
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      message: '<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };

    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || icons.info}</span>
      <span class="toast__message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ── Play Sound ────────────────────────────
  playSound() {
    if (!this.soundEnabled) return;
    
    try {
      // Create a simple notification beep
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio might not be available
    }
  },

  // ── Notify New Message ────────────────────
  notifyMessage(contactName, messageText) {
    this.playSound();
    
    const shortText = messageText.length > 40 
      ? messageText.substring(0, 40) + '...' 
      : messageText;
    
    this.showToast(`<strong>${contactName}:</strong> ${shortText}`, 'message', 4000);

    // Update page title
    this.flashTitle(contactName);
  },

  // ── Flash Title ───────────────────────────
  _originalTitle: document.title,
  _titleInterval: null,

  flashTitle(name) {
    if (document.hasFocus()) return;
    
    clearInterval(this._titleInterval);
    let toggle = false;
    
    this._titleInterval = setInterval(() => {
      document.title = toggle ? `💬 ${name} sent a message` : this._originalTitle;
      toggle = !toggle;
    }, 1500);

    // Stop flashing when window gets focus
    const stopFlash = () => {
      clearInterval(this._titleInterval);
      document.title = this._originalTitle;
      window.removeEventListener('focus', stopFlash);
    };
    window.addEventListener('focus', stopFlash);
  }
};
