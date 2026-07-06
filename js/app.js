/* ============================================
   iCHAT — Main Application Controller
   ============================================ */

(function() {
  'use strict';

  // ── Auth Guard ────────────────────────────
  const user = Storage.getUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  // ── Initialize Modules ────────────────────
  ThemeManager.init();

  // ── Set User Info ─────────────────────────
  function setUserInfo() {
    const nameEl = document.getElementById('sidebarUserName');
    const avatarLetter = document.getElementById('sidebarAvatarLetter');
    const profileAvatarLetter = document.getElementById('profileAvatarLetter');
    const profileName = document.getElementById('profileName');
    const profileStatus = document.getElementById('profileStatus');

    if (nameEl) nameEl.textContent = user.name;
    if (avatarLetter) avatarLetter.textContent = user.avatar || user.name.charAt(0).toUpperCase();
    if (profileAvatarLetter) profileAvatarLetter.textContent = user.avatar || user.name.charAt(0).toUpperCase();
    if (profileName) profileName.value = user.name;
    if (profileStatus) profileStatus.value = user.status || 'Available';
  }
  setUserInfo();

  // ── Render Contacts List ──────────────────
  function renderContacts(filter = '') {
    const container = document.getElementById('contactsList');
    if (!container) return;

    const contacts = ContactsManager.getAll();
    const filtered = filter 
      ? contacts.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
      : contacts;

    container.innerHTML = filtered.map((contact, index) => {
      const lastMsg = ContactsManager.getLastMessage(contact.id);
      const unread = ContactsManager.getUnreadCount(contact.id);
      const lastMsgText = lastMsg 
        ? (lastMsg.sent ? 'You: ' : '') + (lastMsg.text.length > 30 ? lastMsg.text.substring(0, 30) + '...' : lastMsg.text)
        : 'Start a conversation';
      const lastTime = lastMsg ? (typeof lastMsg.time === 'string' && !lastMsg.time.includes('T') ? lastMsg.time : ChatEngine.formatTime(lastMsg.time)) : '';

      return `
        <div class="contact-item stagger-${index + 1}" data-id="${contact.id}" style="animation: fadeInLeft 0.4s ease-out both; animation-delay: ${index * 0.05}s">
          <div class="contact-item__avatar">
            <div class="avatar avatar--md" style="background: ${contact.avatarColor}">
              <span>${contact.avatar}</span>
            </div>
            <span class="status-dot status-dot--${contact.status}"></span>
          </div>
          <div class="contact-item__info">
            <div class="contact-item__top">
              <span class="contact-item__name">${contact.name}</span>
              <span class="contact-item__time">${lastTime}</span>
            </div>
            <div class="contact-item__bottom">
              <span class="contact-item__message">${lastMsgText}</span>
              ${unread > 0 ? `<span class="badge contact-item__badge">${unread}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Click handlers
    container.querySelectorAll('.contact-item').forEach(el => {
      el.addEventListener('click', () => {
        ChatEngine.openChat(el.dataset.id);
      });
    });
  }
  renderContacts();

  // ── Search ────────────────────────────────
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderContacts(e.target.value);
    });
  }

  // ── Message Input ─────────────────────────
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  if (messageInput) {
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      
      // Toggle send button state
      if (this.value.trim()) {
        sendBtn.classList.remove('chat-input__send-btn--disabled');
      } else {
        sendBtn.classList.add('chat-input__send-btn--disabled');
      }
    });

    // Enter to send (Shift+Enter for new line)
    messageInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCurrentMessage();
      }
    });
  }

  // Send button click
  if (sendBtn) {
    sendBtn.addEventListener('click', sendCurrentMessage);
  }

  function sendCurrentMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    ChatEngine.sendMessage(text);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.classList.add('chat-input__send-btn--disabled');
    messageInput.focus();

    // Close emoji picker
    EmojiPicker.close();
  }

  // ── Emoji Picker ──────────────────────────
  EmojiPicker.init((emoji) => {
    if (messageInput) {
      const start = messageInput.selectionStart;
      const end = messageInput.selectionEnd;
      const text = messageInput.value;
      messageInput.value = text.substring(0, start) + emoji + text.substring(end);
      messageInput.focus();
      messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
      
      // Trigger input event for send button state
      messageInput.dispatchEvent(new Event('input'));
    }
  });

  const emojiToggle = document.getElementById('emojiToggleBtn');
  if (emojiToggle) {
    emojiToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      EmojiPicker.toggle();
    });
  }

  // Close emoji picker on outside click
  document.addEventListener('click', (e) => {
    const picker = document.getElementById('emojiPicker');
    const toggle = document.getElementById('emojiToggleBtn');
    if (picker && !picker.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
      EmojiPicker.close();
    }
  });

  // ── Theme Toggle ──────────────────────────
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      ThemeManager.toggle();
    });
  }

  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) {
    themeSwitch.addEventListener('click', () => {
      ThemeManager.toggle();
    });
  }

  // ── Profile Modal ─────────────────────────
  const profileBtn = document.getElementById('profileBtn');
  const profileModal = document.getElementById('profileModal');
  const closeProfileBtn = document.getElementById('closeProfileBtn');
  const sidebarProfile = document.getElementById('sidebarProfile');

  function openProfile() {
    if (profileModal) profileModal.classList.add('modal-overlay--open');
  }

  function closeProfile() {
    if (profileModal) profileModal.classList.remove('modal-overlay--open');
    
    // Save profile changes
    const nameInput = document.getElementById('profileName');
    const statusInput = document.getElementById('profileStatus');
    
    if (nameInput && nameInput.value.trim()) {
      user.name = nameInput.value.trim();
      user.avatar = user.name.charAt(0).toUpperCase();
      Storage.setUser(user);
      setUserInfo();
    }
    if (statusInput) {
      user.status = statusInput.value.trim();
      Storage.setUser(user);
    }
  }

  if (profileBtn) profileBtn.addEventListener('click', openProfile);
  if (sidebarProfile) sidebarProfile.addEventListener('click', openProfile);
  if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProfile);
  
  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) closeProfile();
    });
  }

  // ── Back Button (Mobile) ──────────────────
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      ChatEngine.closeChat();
    });
  }

  // ── Logout ────────────────────────────────
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Storage.removeUser();
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 300);
    });
  }

  // ── Keyboard Shortcuts ────────────────────
  document.addEventListener('keydown', (e) => {
    // Escape to close modals/emoji
    if (e.key === 'Escape') {
      EmojiPicker.close();
      closeProfile();
      if (window.innerWidth <= 768 && ChatEngine.activeContact) {
        ChatEngine.closeChat();
      }
    }
    
    // Ctrl+K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }
  });

  // ── Handle Resize ─────────────────────────
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('sidebar--hidden');
      }
    }, 200);
  });

  // ── Page Fade In ──────────────────────────
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });

  // ── Welcome Toast ─────────────────────────
  setTimeout(() => {
    NotificationsManager.showToast(`Welcome back, ${user.name}! 👋`, 'success', 3000);
  }, 800);

})();
