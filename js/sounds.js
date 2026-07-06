// ============================================
// iCHAT — Sound Manager
// Retro sound effects using Web Audio API
// ============================================

const SoundManager = (() => {
    let audioCtx = null;
    let enabled = true;

    function getContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function isEnabled() {
        return enabled;
    }

    function setEnabled(val) {
        enabled = val;
        localStorage.setItem('ichat_sound_enabled', val ? '1' : '0');
    }

    function loadPreference() {
        const stored = localStorage.getItem('ichat_sound_enabled');
        if (stored !== null) {
            enabled = stored === '1';
        }
    }

    // ── Simple beep tone ──
    function playTone(frequency, duration, type = 'square', volume = 0.15) {
        if (!enabled) return;
        try {
            const ctx = getContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
            // Audio not available
        }
    }

    // ── Multi-tone sequence ──
    function playSequence(notes) {
        if (!enabled) return;
        try {
            const ctx = getContext();
            let time = ctx.currentTime;

            notes.forEach(note => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.type = note.type || 'square';
                oscillator.frequency.setValueAtTime(note.freq, time);

                gainNode.gain.setValueAtTime(note.volume || 0.12, time);
                gainNode.gain.exponentialRampToValueAtTime(0.001, time + note.dur);

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.start(time);
                oscillator.stop(time + note.dur);

                time += note.dur * (note.gap || 0.9);
            });
        } catch (e) {
            // Audio not available
        }
    }

    // ─────────── Sound Effects ───────────

    function playClick() {
        playTone(800, 0.05, 'square', 0.08);
    }

    function playMessage() {
        // Classic "ding" - two quick ascending tones
        playSequence([
            { freq: 880, dur: 0.08, type: 'sine', volume: 0.15 },
            { freq: 1320, dur: 0.12, type: 'sine', volume: 0.12, gap: 0.7 },
        ]);
    }

    function playUserJoin() {
        // Ascending three-tone chime (AIM-inspired)
        playSequence([
            { freq: 523, dur: 0.1, type: 'sine', volume: 0.12 },
            { freq: 659, dur: 0.1, type: 'sine', volume: 0.12, gap: 0.8 },
            { freq: 784, dur: 0.15, type: 'sine', volume: 0.1, gap: 0.8 },
        ]);
    }

    function playUserLeave() {
        // Descending three-tone (AIM door close)
        playSequence([
            { freq: 784, dur: 0.1, type: 'sine', volume: 0.12 },
            { freq: 659, dur: 0.1, type: 'sine', volume: 0.12, gap: 0.8 },
            { freq: 523, dur: 0.15, type: 'sine', volume: 0.1, gap: 0.8 },
        ]);
    }

    function playWhisper() {
        // Soft double tap
        playSequence([
            { freq: 1200, dur: 0.06, type: 'sine', volume: 0.1 },
            { freq: 1500, dur: 0.08, type: 'sine', volume: 0.08, gap: 1.2 },
        ]);
    }

    function playError() {
        // Windows error sound
        playSequence([
            { freq: 300, dur: 0.15, type: 'square', volume: 0.15 },
            { freq: 200, dur: 0.2, type: 'square', volume: 0.12, gap: 0.9 },
        ]);
    }

    function playRoll() {
        // Dice roll — quick random tones
        const notes = [];
        for (let i = 0; i < 6; i++) {
            notes.push({
                freq: 300 + Math.random() * 600,
                dur: 0.04,
                type: 'square',
                volume: 0.08,
                gap: 0.9
            });
        }
        notes.push({ freq: 880, dur: 0.12, type: 'sine', volume: 0.12, gap: 0.8 });
        playSequence(notes);
    }

    function playDialup() {
        if (!enabled) return;
        try {
            const ctx = getContext();
            const time = ctx.currentTime;

            // Dial tone
            const dial = ctx.createOscillator();
            const dialGain = ctx.createGain();
            dial.type = 'sine';
            dial.frequency.setValueAtTime(440, time);
            dialGain.gain.setValueAtTime(0.08, time);
            dialGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            dial.connect(dialGain);
            dialGain.connect(ctx.destination);
            dial.start(time);
            dial.stop(time + 0.5);

            // "Handshake" noise
            const noise = ctx.createOscillator();
            const noiseGain = ctx.createGain();
            noise.type = 'sawtooth';
            noise.frequency.setValueAtTime(1200, time + 0.6);
            noise.frequency.linearRampToValueAtTime(2400, time + 1.2);
            noise.frequency.linearRampToValueAtTime(800, time + 1.5);
            noiseGain.gain.setValueAtTime(0.04, time + 0.6);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);
            noise.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(time + 0.6);
            noise.stop(time + 1.8);

            // Connection success beep
            const success = ctx.createOscillator();
            const successGain = ctx.createGain();
            success.type = 'sine';
            success.frequency.setValueAtTime(1000, time + 2.0);
            successGain.gain.setValueAtTime(0.1, time + 2.0);
            successGain.gain.exponentialRampToValueAtTime(0.001, time + 2.3);
            success.connect(successGain);
            successGain.connect(ctx.destination);
            success.start(time + 2.0);
            success.stop(time + 2.3);
        } catch (e) {
            // Audio not available
        }
    }

    // Load preference on init
    loadPreference();

    return {
        playClick,
        playMessage,
        playUserJoin,
        playUserLeave,
        playWhisper,
        playError,
        playRoll,
        playDialup,
        isEnabled,
        setEnabled,
        getContext, // Needed to unlock audio on first interaction
    };
})();
