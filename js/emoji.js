// ============================================
// iCHAT — Emoji Parser
// Convert text emoticons to emoji
// ============================================

const EmojiParser = (() => {
    const emojiMap = {
        ':)':   '😊', ':-)':  '😊',
        ':D':   '😄', ':-D':  '😄',
        ':(': '😞', ':-(': '😞',
        ';)':   '😉', ';-)':  '😉',
        ':P':   '😛', ':-P':  '😛',
        ':p':   '😛', ':-p':  '😛',
        'XD':   '😆', 'xD':   '😆',
        ':O':   '😮', ':-O':  '😮',
        ':o':   '😮',
        ":'(":  '😢',
        '>:(': '😠',
        'B)':   '😎', 'B-)':  '😎',
        '<3':   '❤️',
        '</3':  '💔',
        ':*':   '😘',
        'O:)':  '😇',
        '3:)':  '😈',
        ':|':   '😐', ':-|':  '😐',
        ':/':   '😕', ':-/':  '😕',
        ':$':   '😳',
        '^_^':  '😊',
        'T_T':  '😭',
        '-_-':  '😑',
        'o_O':  '🤨',
        'O_o':  '🤨',
        '(y)':  '👍',
        '(n)':  '👎',
        '(heart)': '❤️',
        '(star)':  '⭐',
        '(fire)':  '🔥',
        '(100)':   '💯',
        '(wave)':  '👋',
        '(clap)':  '👏',
        '(lol)':   '😂',
        '(cry)':   '😭',
        '(cool)':  '😎',
        '(skull)': '💀',
        '(ghost)': '👻',
        '(poop)':  '💩',
        '(music)': '🎵',
        '(game)':  '🎮',
        '(computer)': '🖥️',
        '(phone)': '📱',
        '(pizza)': '🍕',
        '(coffee)':'☕',
        '(beer)':  '🍺',
        '(party)': '🎉',
        '(rocket)':'🚀',
        '(eyes)':  '👀',
    };

    // Sort by length (longest first) to match multi-char emoticons first
    const sortedKeys = Object.keys(emojiMap).sort((a, b) => b.length - a.length);

    function parse(text) {
        let result = text;

        sortedKeys.forEach(emoticon => {
            // Escape special regex characters
            const escaped = emoticon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Only replace when the emoticon is surrounded by spaces or at start/end
            const regex = new RegExp(`(^|\\s|(?<=\\s))${escaped}($|\\s|(?=\\s))`, 'g');
            result = result.replace(regex, (match, before, after) => {
                return (before || '') + emojiMap[emoticon] + (after || '');
            });
        });

        // Simple approach: direct replacement for standalone emoticons
        sortedKeys.forEach(emoticon => {
            // Use split/join for exact matches (simpler and more reliable)
            const parts = result.split(emoticon);
            if (parts.length > 1) {
                result = parts.join(emojiMap[emoticon]);
            }
        });

        return result;
    }

    // Format text with basic markdown-like syntax
    function formatText(text) {
        let formatted = text;

        // Bold: **text**
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic: *text*
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Code: `text`
        formatted = formatted.replace(/`(.+?)`/g, '<code style="background:#333;padding:1px 4px;border-radius:2px;font-family:monospace;">$1</code>');

        // URLs
        formatted = formatted.replace(
            /(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener" style="color:var(--neon-cyan);text-decoration:underline;">$1</a>'
        );

        return formatted;
    }

    // Full processing pipeline
    function process(text) {
        let result = escapeHtml(text);
        result = parse(result);
        result = formatText(result);
        return result;
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return { parse, formatText, process, escapeHtml };
})();
