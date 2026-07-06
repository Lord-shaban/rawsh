// ============================================
// iCHAT — Digital Clock
// Retro LED clock display
// ============================================

const RetroClock = (() => {
    let intervalId = null;

    function start(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;

        function update() {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            el.textContent = `${h}:${m}:${s}`;
        }

        update();
        intervalId = setInterval(update, 1000);
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function getTimestamp() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    return { start, stop, getTimestamp };
})();
