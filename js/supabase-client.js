// ============================================
// iCHAT — Supabase Client Initialization
// ============================================

let supabase = null;

function initSupabase() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('⚠️ Supabase not configured! Running in demo mode.');
        return null;
    }

    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
        return supabase;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        return null;
    }
}

function getSupabase() {
    return supabase;
}

// ============================================
// Database Helper Functions
// ============================================

async function dbCreateUser(userData) {
    if (!supabase) return { data: userData, error: null };

    const { data, error } = await supabase
        .from('users')
        .upsert({
            id: userData.id,
            screen_name: userData.screenName,
            avatar: userData.avatar,
            text_color: userData.textColor,
            status: 'online',
            last_seen: new Date().toISOString()
        }, { onConflict: 'id' })
        .select()
        .single();

    return { data, error };
}

async function dbUpdateUserStatus(userId, status, awayMessage = '') {
    if (!supabase) return;

    await supabase
        .from('users')
        .update({
            status: status,
            away_message: awayMessage,
            last_seen: new Date().toISOString()
        })
        .eq('id', userId);
}

async function dbSaveMessage(messageData) {
    if (!supabase) return { data: messageData, error: null };

    const { data, error } = await supabase
        .from('messages')
        .insert({
            room_id: messageData.roomId,
            user_id: messageData.userId,
            screen_name: messageData.screenName,
            content: messageData.content,
            text_color: messageData.textColor,
            type: messageData.type || 'message'
        })
        .select()
        .single();

    return { data, error };
}

async function dbLoadMessages(roomId, limit = 50) {
    if (!supabase) return { data: [], error: null };

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (data) data.reverse();
    return { data: data || [], error };
}

async function dbIncrementVisitor() {
    if (!supabase) {
        const count = parseInt(localStorage.getItem('ichat_visitor_count') || '0') + 1;
        localStorage.setItem('ichat_visitor_count', count.toString());
        return count;
    }

    const { data, error } = await supabase.rpc('increment_visitor');
    return error ? 42 : data;
}

async function dbGetRoomCounts() {
    if (!supabase) return {};
    // This will be handled by Presence tracking instead
    return {};
}
