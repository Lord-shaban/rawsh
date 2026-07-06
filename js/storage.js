/* ============================================
   iCHAT — Local Storage Manager
   ============================================ */

const Storage = {
  KEYS: {
    USER: 'ichat_user',
    MESSAGES: 'ichat_messages',
    THEME: 'ichat_theme',
    CONTACTS_STATE: 'ichat_contacts_state'
  },

  // ── User ──────────────────────────────────
  getUser() {
    try {
      const data = localStorage.getItem(this.KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
  },

  removeUser() {
    localStorage.removeItem(this.KEYS.USER);
  },

  // ── Messages ──────────────────────────────
  getMessages(contactId) {
    try {
      const all = JSON.parse(localStorage.getItem(this.KEYS.MESSAGES) || '{}');
      return all[contactId] || [];
    } catch {
      return [];
    }
  },

  saveMessage(contactId, message) {
    try {
      const all = JSON.parse(localStorage.getItem(this.KEYS.MESSAGES) || '{}');
      if (!all[contactId]) all[contactId] = [];
      all[contactId].push(message);
      localStorage.setItem(this.KEYS.MESSAGES, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to save message:', e);
    }
  },

  getAllMessages() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.MESSAGES) || '{}');
    } catch {
      return {};
    }
  },

  // ── Theme ─────────────────────────────────
  getTheme() {
    return localStorage.getItem(this.KEYS.THEME) || 'dark';
  },

  setTheme(theme) {
    localStorage.setItem(this.KEYS.THEME, theme);
  },

  // ── Clear All ─────────────────────────────
  clearAll() {
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
  }
};
