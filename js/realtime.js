// ============================================
// iCHAT — Realtime Module
// Supabase Broadcast + Presence
// ============================================

const Realtime = (() => {
    let channel = null;
    let currentRoom = null;
    let onlineUsers = {};
    let callbacks = {
        onMessage: null,
        onUserJoin: null,
        onUserLeave: null,
        onPresenceSync: null,
        onTyping: null,
    };

    // Join a chat room channel
    async function joinRoom(roomId, user, cbs) {
        callbacks = { ...callbacks, ...cbs };
        currentRoom = roomId;

        const sb = getSupabase();
        if (!sb) {
            console.warn('Supabase not configured — running in local demo mode');
            onlineUsers[user.id] = {
                id: user.id,
                screenName: user.screenName,
                avatar: user.avatarEmoji,
                textColor: user.textColor,
                status: 'online',
                joinedAt: new Date().toISOString(),
            };
            if (callbacks.onPresenceSync) {
                callbacks.onPresenceSync(Object.values(onlineUsers));
            }
            return;
        }

        // Clean up previous channel
        if (channel) {
            await sb.removeChannel(channel);
        }

        channel = sb.channel(`room-${roomId}`, {
            config: {
                broadcast: { self: true },
                presence: { key: user.id },
            }
        });

        // Listen for broadcast messages
        channel.on('broadcast', { event: 'chat-message' }, (payload) => {
            if (callbacks.onMessage) {
                callbacks.onMessage(payload.payload);
            }
        });

        // Listen for typing indicators
        channel.on('broadcast', { event: 'typing' }, (payload) => {
            if (callbacks.onTyping && payload.payload.userId !== user.id) {
                callbacks.onTyping(payload.payload);
            }
        });

        // Listen for presence sync
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users = [];
            Object.values(state).forEach(presences => {
                presences.forEach(p => users.push(p));
            });
            onlineUsers = {};
            users.forEach(u => { onlineUsers[u.id] = u; });
            if (callbacks.onPresenceSync) {
                callbacks.onPresenceSync(users);
            }
        });

        // Listen for joins
        channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
            newPresences.forEach(p => {
                onlineUsers[p.id] = p;
                if (callbacks.onUserJoin && p.id !== user.id) {
                    callbacks.onUserJoin(p);
                }
            });
        });

        // Listen for leaves
        channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            leftPresences.forEach(p => {
                delete onlineUsers[p.id];
                if (callbacks.onUserLeave && p.id !== user.id) {
                    callbacks.onUserLeave(p);
                }
            });
        });

        // Subscribe and track presence
        await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    id: user.id,
                    screenName: user.screenName,
                    avatar: user.avatarEmoji,
                    textColor: user.textColor,
                    status: user.status || 'online',
                    joinedAt: new Date().toISOString(),
                });
                console.log(`✅ Joined room: ${roomId}`);
            }
        });
    }

    // Send a chat message
    async function sendMessage(messageData) {
        const sb = getSupabase();

        // Save to database
        dbSaveMessage(messageData);

        if (!sb || !channel) {
            // Local demo mode — trigger callback directly
            if (callbacks.onMessage) {
                callbacks.onMessage({
                    ...messageData,
                    timestamp: new Date().toISOString(),
                });
            }
            return;
        }

        // Broadcast to all users
        await channel.send({
            type: 'broadcast',
            event: 'chat-message',
            payload: {
                ...messageData,
                timestamp: new Date().toISOString(),
            }
        });
    }

    // Send typing indicator
    let typingTimeout = null;
    function sendTyping(userId, screenName) {
        if (!channel) return;
        if (typingTimeout) return; // Throttle

        channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId, screenName }
        });

        typingTimeout = setTimeout(() => {
            typingTimeout = null;
        }, 2000);
    }

    // Update presence status
    async function updateStatus(status, awayMessage = '') {
        if (!channel) return;

        const user = getCurrentUser();
        if (!user) return;

        user.status = status;
        user.awayMessage = awayMessage;
        saveUser(user);

        await channel.track({
            id: user.id,
            screenName: user.screenName,
            avatar: user.avatarEmoji,
            textColor: user.textColor,
            status: status,
            awayMessage: awayMessage,
            joinedAt: new Date().toISOString(),
        });

        dbUpdateUserStatus(user.id, status, awayMessage);
    }

    // Leave the current room
    async function leaveRoom() {
        const sb = getSupabase();
        if (sb && channel) {
            await channel.untrack();
            await sb.removeChannel(channel);
            channel = null;
        }
        currentRoom = null;
        onlineUsers = {};
    }

    // Get online users
    function getOnlineUsers() {
        return Object.values(onlineUsers);
    }

    // Get current room
    function getCurrentRoom() {
        return currentRoom;
    }

    return {
        joinRoom,
        sendMessage,
        sendTyping,
        updateStatus,
        leaveRoom,
        getOnlineUsers,
        getCurrentRoom,
    };
})();
