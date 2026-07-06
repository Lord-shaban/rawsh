/* ============================================
   iCHAT — Authentication (Login Page)
   ============================================ */

(function() {
  'use strict';

  // Check if already logged in
  const user = Storage.getUser();
  if (user) {
    window.location.href = 'chat.html';
    return;
  }

  // ── Generate Floating Particles ─────────
  const particlesContainer = document.getElementById('loginParticles');
  if (particlesContainer) {
    for (let i = 0; i < 30; i++) {
      const dot = document.createElement('div');
      dot.className = 'login-particles__dot';
      dot.style.left = Math.random() * 100 + '%';
      dot.style.animationDuration = (15 + Math.random() * 20) + 's';
      dot.style.animationDelay = (Math.random() * 15) + 's';
      dot.style.width = (2 + Math.random() * 3) + 'px';
      dot.style.height = dot.style.width;
      dot.style.opacity = (0.2 + Math.random() * 0.4);
      
      // Random colors
      const colors = [
        'rgba(99, 102, 241, 0.5)',
        'rgba(139, 92, 246, 0.4)',
        'rgba(236, 72, 153, 0.4)',
        'rgba(34, 211, 238, 0.3)',
      ];
      dot.style.background = colors[Math.floor(Math.random() * colors.length)];
      
      particlesContainer.appendChild(dot);
    }
  }

  // ── Form Handling ─────────────────────────
  const form = document.getElementById('loginForm');
  const input = document.getElementById('usernameInput');
  const errorEl = document.getElementById('usernameError');
  const submitBtn = document.getElementById('loginBtn');

  // Focus input on page load
  setTimeout(() => input && input.focus(), 500);

  // Real-time validation
  input.addEventListener('input', function() {
    const val = this.value.trim();
    if (val.length > 0 && val.length < 2) {
      errorEl.classList.add('login-form__error--visible');
    } else {
      errorEl.classList.remove('login-form__error--visible');
    }
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = input.value.trim();
    
    if (username.length < 2) {
      errorEl.classList.add('login-form__error--visible');
      input.focus();
      return;
    }

    // Add loading state
    submitBtn.classList.add('login-form__submit--loading');

    // Simulate login delay
    setTimeout(() => {
      const user = {
        id: 'user_' + Date.now(),
        name: username,
        avatar: username.charAt(0).toUpperCase(),
        status: 'Available',
        joinedAt: new Date().toISOString()
      };

      Storage.setUser(user);
      
      // Navigate with a smooth transition
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.3s ease';
      
      setTimeout(() => {
        window.location.href = 'chat.html';
      }, 300);
    }, 800);
  });

  // Enter key submit
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

})();
