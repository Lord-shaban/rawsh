// ============================================
// iCHAT — Settings Manager
// ============================================

const Settings = (() => {
    const SETTINGS_KEY = 'ichat_settings';

    const defaults = {
        crtEnabled: true,
        soundEnabled: true,
        fontSize: 'medium',  // small, medium, large
    };

    function load() {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            return stored ? { ...defaults, ...JSON.parse(stored) } : { ...defaults };
        } catch {
            return { ...defaults };
        }
    }

    function save(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function get(key) {
        return load()[key];
    }

    function set(key, value) {
        const settings = load();
        settings[key] = value;
        save(settings);
        apply(settings);
    }

    function apply(settings) {
        if (!settings) settings = load();

        // CRT effect
        document.body.classList.toggle('crt-on', settings.crtEnabled);

        // Sound
        SoundManager.setEnabled(settings.soundEnabled);

        // Font size
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.classList.remove('fs-small', 'fs-medium', 'fs-large');
            chatMessages.classList.add(`fs-${settings.fontSize}`);
        }
    }

    function init() {
        apply();
    }

    return { load, save, get, set, apply, init };
})();
