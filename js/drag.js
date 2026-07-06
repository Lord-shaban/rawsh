// ============================================
// iCHAT — Draggable Windows
// ============================================

const DragManager = (() => {
    function makeDraggable(windowEl) {
        const titlebar = windowEl.querySelector('.win95-titlebar');
        if (!titlebar) return;

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        titlebar.addEventListener('mousedown', (e) => {
            if (e.target.closest('.win95-titlebar-btn')) return;
            isDragging = true;
            const rect = windowEl.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            windowEl.style.zIndex = getTopZ();
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            windowEl.style.position = 'fixed';
            windowEl.style.left = Math.max(0, x) + 'px';
            windowEl.style.top = Math.max(0, y) + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    let topZ = 100;
    function getTopZ() {
        return ++topZ;
    }

    // Initialize all draggable windows
    function initAll() {
        document.querySelectorAll('.win95-window.draggable').forEach(makeDraggable);
    }

    return { makeDraggable, initAll };
})();
