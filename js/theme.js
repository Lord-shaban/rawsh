/* ============================================
   iCHAT — Theme Manager
   ============================================ */

const ThemeManager = {
  init() {
    const saved = Storage.getTheme();
    this.apply(saved);
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
    this.updateToggle(theme);
    
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = theme === 'dark' ? '#07070d' : '#f0f2f5';
    }
  },

  toggle() {
    const current = Storage.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.apply(next);
    return next;
  },

  updateToggle(theme) {
    const switcher = document.getElementById('themeSwitch');
    if (switcher) {
      if (theme === 'light') {
        switcher.classList.add('theme-switch--active');
      } else {
        switcher.classList.remove('theme-switch--active');
      }
    }
  }
};
