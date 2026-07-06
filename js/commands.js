// ============================================
// iCHAT — Chat Commands
// /me, /roll, /flip, /color, /shrug, etc.
// ============================================

const ChatCommands = (() => {
    const commands = {};

    // Register a command
    function register(name, handler, description) {
        commands[name.toLowerCase()] = { handler, description };
    }

    // Parse and execute a command
    function execute(input, context) {
        if (!input.startsWith('/')) return null;

        const parts = input.slice(1).split(' ');
        const cmdName = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        const cmd = commands[cmdName];
        if (!cmd) {
            return {
                type: 'error',
                content: `Unknown command: /${cmdName}. Type /help for a list of commands.`
            };
        }

        return cmd.handler(args, context);
    }

    // Check if input is a command
    function isCommand(input) {
        return input.startsWith('/');
    }

    // Get help text
    function getHelp() {
        const lines = ['═══ Available Commands ═══'];
        Object.entries(commands).forEach(([name, cmd]) => {
            lines.push(`  /${name} — ${cmd.description}`);
        });
        lines.push('═══════════════════════════');
        return lines.join('\n');
    }

    // ─────────── Built-in Commands ───────────

    // /me [action] — Action message
    register('me', (args, ctx) => {
        if (!args.trim()) {
            return { type: 'error', content: 'Usage: /me [action]' };
        }
        return {
            type: 'action',
            content: args.trim(),
            broadcast: true
        };
    }, 'Send an action message (e.g., /me is coding)');

    // /roll — Roll a dice
    register('roll', (args, ctx) => {
        const max = parseInt(args) || 6;
        const result = Math.floor(Math.random() * max) + 1;
        SoundManager.playRoll();
        return {
            type: 'roll',
            content: `🎲 ${ctx.screenName} rolled a ${result} (1-${max})`,
            broadcast: true
        };
    }, 'Roll a dice (default: 1-6, or /roll 20 for 1-20)');

    // /flip — Flip a coin
    register('flip', (args, ctx) => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        return {
            type: 'roll',
            content: `🪙 ${ctx.screenName} flipped a coin: **${result}**!`,
            broadcast: true
        };
    }, 'Flip a coin');

    // /shrug — Send shrug
    register('shrug', (args, ctx) => {
        const text = args ? `${args} ¯\\_(ツ)_/¯` : '¯\\_(ツ)_/¯';
        return {
            type: 'message',
            content: text,
            broadcast: true
        };
    }, 'Send a shrug ¯\\_(ツ)_/¯');

    // /tableflip
    register('tableflip', (args, ctx) => {
        return {
            type: 'message',
            content: '(╯°□°)╯︵ ┻━┻',
            broadcast: true
        };
    }, 'Flip a table!');

    // /unflip
    register('unflip', (args, ctx) => {
        return {
            type: 'message',
            content: '┬─┬ ノ( ゜-゜ノ)',
            broadcast: true
        };
    }, 'Put the table back');

    // /color [hex] — Change text color
    register('color', (args, ctx) => {
        const color = args.trim();
        if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return {
                type: 'error',
                content: 'Usage: /color #FF00FF (hex color code)'
            };
        }
        // Update user color
        const user = getCurrentUser();
        if (user) {
            user.textColor = color;
            saveUser(user);
        }
        return {
            type: 'system',
            content: `Text color changed to ${color}`,
            colorChange: color
        };
    }, 'Change your text color (e.g., /color #FF00FF)');

    // /clear — Clear chat locally
    register('clear', (args, ctx) => {
        const messages = document.getElementById('chat-messages');
        if (messages) messages.innerHTML = '';
        return {
            type: 'system',
            content: 'Chat cleared locally.'
        };
    }, 'Clear chat messages locally');

    // /away [message] — Set away status
    register('away', (args, ctx) => {
        const message = args.trim() || 'Away from keyboard';
        return {
            type: 'status',
            status: 'away',
            awayMessage: message,
            content: `${ctx.screenName} is now away: ${message}`,
            broadcast: true
        };
    }, 'Set your status to Away (e.g., /away BRB)');

    // /back — Return from away
    register('back', (args, ctx) => {
        return {
            type: 'status',
            status: 'online',
            awayMessage: '',
            content: `${ctx.screenName} is back!`,
            broadcast: true
        };
    }, 'Return from Away status');

    // /nick [name] — (info only)
    register('nick', (args, ctx) => {
        return {
            type: 'error',
            content: 'To change your screen name, please log out and log back in.'
        };
    }, 'Info about changing your screen name');

    // /help — Show help
    register('help', (args, ctx) => {
        return {
            type: 'help',
            content: getHelp()
        };
    }, 'Show this help message');

    // /whisper [user] [message] — Private message
    register('whisper', (args, ctx) => {
        const parts = args.split(' ');
        const targetName = parts[0];
        const message = parts.slice(1).join(' ');

        if (!targetName || !message.trim()) {
            return {
                type: 'error',
                content: 'Usage: /whisper [username] [message]'
            };
        }

        return {
            type: 'whisper',
            target: targetName,
            content: message.trim(),
            broadcast: true
        };
    }, 'Send a private message (e.g., /whisper CyberKid99 Hey!)');

    // Short alias for whisper
    register('w', (args, ctx) => {
        return commands['whisper'].handler(args, ctx);
    }, 'Short alias for /whisper');

    // /users — List online users
    register('users', (args, ctx) => {
        return {
            type: 'userlist',
            content: 'Requesting user list...'
        };
    }, 'List online users');

    return { execute, isCommand, getHelp, register };
})();
