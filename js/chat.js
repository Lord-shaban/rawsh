/* ============================================
   iCHAT — Chat Engine
   ============================================ */

const ChatEngine = {
  activeContact: null,
  typingTimeout: null,

  // ── Format Time ───────────────────────────
  formatTime(date) {
    if (typeof date === 'string' && !date.includes('T')) return date;
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  },

  // ── Create Message Object ────────────────
  createMessage(text, sent = true) {
    return {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      text: text,
      sent: sent,
      time: new Date().toISOString(),
      status: sent ? 'delivered' : 'received',
      read: !sent
    };
  },

  // ── Render Read Receipts ──────────────────
  renderStatus(status) {
    if (status === 'read') {
      return `<span class="message__status message__status--read">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 13 5 17 15 7"/>
          <polyline points="6 13 10 17 20 7"/>
        </svg>
      </span>`;
    }
    return `<span class="message__status message__status--delivered">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="1 13 5 17 15 7"/>
        <polyline points="6 13 10 17 20 7"/>
      </svg>
    </span>`;
  },

  // ── Render Single Message ─────────────────
  renderMessage(msg) {
    const type = msg.sent ? 'sent' : 'received';
    const time = this.formatTime(msg.time);
    const statusHtml = msg.sent ? this.renderStatus(msg.status || 'delivered') : '';

    return `
      <div class="message message--${type}" data-id="${msg.id || ''}">
        <div class="message__bubble">
          <span class="message__text">${this.escapeHtml(msg.text)}</span>
          <div class="message__meta">
            <span class="message__time">${time}</span>
            ${statusHtml}
          </div>
        </div>
      </div>
    `;
  },

  // ── Escape HTML ───────────────────────────
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // ── Load Messages for Contact ─────────────
  loadMessages(contactId) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    // Get stored messages or initial messages
    let messages = Storage.getMessages(contactId);
    
    if (messages.length === 0) {
      // Load initial messages
      const initial = ContactsManager.getInitialMessages(contactId);
      messages = initial.map(msg => ({
        ...msg,
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        status: msg.sent ? 'read' : 'received'
      }));
      
      // Save initial messages to storage
      messages.forEach(msg => Storage.saveMessage(contactId, msg));
    }

    // Render date divider + messages
    let html = `
      <div class="chat-messages__date-divider">
        <span class="chat-messages__date-label">Today</span>
      </div>
    `;
    
    html += messages.map(msg => this.renderMessage(msg)).join('');
    container.innerHTML = html;

    // Scroll to bottom
    this.scrollToBottom();
  },

  // ── Send Message ──────────────────────────
  sendMessage(text) {
    if (!this.activeContact || !text.trim()) return;

    const msg = this.createMessage(text.trim(), true);
    
    // Save to storage
    Storage.saveMessage(this.activeContact.id, msg);

    // Append to DOM
    const container = document.getElementById('chatMessages');
    container.insertAdjacentHTML('beforeend', this.renderMessage(msg));
    this.scrollToBottom();

    // Update sidebar last message
    this.updateContactLastMessage(this.activeContact.id, msg);

    // Simulate reply
    this.simulateReply(this.activeContact.id);

    // Mark sent message as read after a delay
    setTimeout(() => {
      msg.status = 'read';
      const msgEl = container.querySelector(`[data-id="${msg.id}"] .message__status`);
      if (msgEl) {
        msgEl.classList.remove('message__status--delivered');
        msgEl.classList.add('message__status--read');
      }
    }, 2000);
  },

  // ── Simulate Auto Reply ───────────────────
  simulateReply(contactId) {
    const contact = ContactsManager.getById(contactId);
    if (!contact || contact.status === 'offline') return;

    // Show typing indicator
    const typingDelay = 800 + Math.random() * 1200;
    const replyDelay = typingDelay + 1500 + Math.random() * 2000;

    setTimeout(() => {
      if (this.activeContact && this.activeContact.id === contactId) {
        this.showTyping(true);
      }
    }, typingDelay);

    setTimeout(() => {
      this.showTyping(false);

      const responseText = ContactsManager.getRandomResponse(contactId);
      const reply = this.createMessage(responseText, false);
      
      // Save to storage
      Storage.saveMessage(contactId, reply);

      // Append to DOM if still on this contact
      if (this.activeContact && this.activeContact.id === contactId) {
        const container = document.getElementById('chatMessages');
        container.insertAdjacentHTML('beforeend', this.renderMessage(reply));
        this.scrollToBottom();
      }

      // Update sidebar
      this.updateContactLastMessage(contactId, reply);

      // Notification
      if (!this.activeContact || this.activeContact.id !== contactId) {
        NotificationsManager.notifyMessage(contact.name, responseText);
      }

    }, replyDelay);
  },

  // ── Show/Hide Typing ─────────────────────
  showTyping(show) {
    const indicator = document.getElementById('typingIndicator');
    if (!indicator) return;

    if (show) {
      indicator.classList.add('typing-indicator--visible');
      this.scrollToBottom();
    } else {
      indicator.classList.remove('typing-indicator--visible');
    }
  },

  // ── Update Contact's Last Message in Sidebar ─
  updateContactLastMessage(contactId, msg) {
    const contactEl = document.querySelector(`.contact-item[data-id="${contactId}"]`);
    if (!contactEl) return;

    const msgPreview = contactEl.querySelector('.contact-item__message');
    const timeEl = contactEl.querySelector('.contact-item__time');

    if (msgPreview) {
      const prefix = msg.sent ? 'You: ' : '';
      const text = msg.text.length > 35 ? msg.text.substring(0, 35) + '...' : msg.text;
      msgPreview.textContent = prefix + text;
    }
    if (timeEl) {
      timeEl.textContent = this.formatTime(msg.time);
    }

    // Move contact to top of list
    const list = contactEl.parentNode;
    if (list && list.firstChild !== contactEl) {
      list.insertBefore(contactEl, list.firstChild);
    }
  },

  // ── Open Chat ─────────────────────────────
  openChat(contactId) {
    const contact = ContactsManager.getById(contactId);
    if (!contact) return;

    this.activeContact = contact;

    // Update UI
    document.getElementById('chatEmpty').style.display = 'none';
    const activeChat = document.getElementById('activeChat');
    activeChat.style.display = 'flex';

    // Set header
    document.getElementById('chatContactName').textContent = contact.name;
    document.getElementById('chatAvatarLetter').textContent = contact.avatar;
    document.getElementById('chatAvatar').style.background = contact.avatarColor;

    // Status
    const statusDot = document.getElementById('chatStatusDot');
    const statusText = document.getElementById('chatStatusText');
    const statusIndicator = document.getElementById('chatStatusIndicator');
    
    statusDot.className = `status-dot status-dot--${contact.status}`;
    
    if (contact.status === 'online') {
      statusIndicator.className = 'chat-header__status-dot chat-header__status-dot--online';
      statusText.textContent = 'Online';
    } else if (contact.status === 'away') {
      statusIndicator.className = 'chat-header__status-dot chat-header__status-dot--offline';
      statusText.textContent = `Last seen ${contact.lastSeen}`;
    } else {
      statusIndicator.className = 'chat-header__status-dot chat-header__status-dot--offline';
      statusText.textContent = `Last seen ${contact.lastSeen}`;
    }

    // Update active contact in sidebar
    document.querySelectorAll('.contact-item').forEach(el => {
      el.classList.toggle('contact-item--active', el.dataset.id === contactId);
    });

    // Remove unread badge
    const badge = document.querySelector(`.contact-item[data-id="${contactId}"] .contact-item__badge`);
    if (badge) badge.remove();

    // Load messages
    this.loadMessages(contactId);

    // Focus input
    setTimeout(() => {
      const input = document.getElementById('messageInput');
      if (input) input.focus();
    }, 100);

    // Mobile: hide sidebar
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.add('sidebar--hidden');
    }
  },

  // ── Scroll to Bottom ──────────────────────
  scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  },

  // ── Close Chat (mobile) ───────────────────
  closeChat() {
    this.activeContact = null;
    document.getElementById('chatEmpty').style.display = '';
    document.getElementById('activeChat').style.display = 'none';

    // Show sidebar
    document.getElementById('sidebar').classList.remove('sidebar--hidden');

    // Remove active state
    document.querySelectorAll('.contact-item').forEach(el => {
      el.classList.remove('contact-item--active');
    });
  }
};
