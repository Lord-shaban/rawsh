-- ============================================
-- iCHAT — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    screen_name TEXT UNIQUE NOT NULL,
    avatar TEXT DEFAULT 'default',
    text_color TEXT DEFAULT '#00FF41',
    status TEXT DEFAULT 'online',
    away_message TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    screen_name TEXT NOT NULL,
    content TEXT NOT NULL,
    text_color TEXT DEFAULT '#00FF41',
    type TEXT DEFAULT 'message',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_screen_name ON users(screen_name);

-- Visitor counter table
CREATE TABLE IF NOT EXISTS visitor_counter (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    count INT DEFAULT 0
);

INSERT INTO visitor_counter (count) VALUES (0) ON CONFLICT DO NOTHING;

-- Function to increment visitor count
CREATE OR REPLACE FUNCTION increment_visitor()
RETURNS INT AS $$
DECLARE new_count INT;
BEGIN
    UPDATE visitor_counter SET count = count + 1 WHERE id = 1
    RETURNING count INTO new_count;
    RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_counter ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read, anyone can insert/update
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (true);

-- Messages: anyone can read, anyone can insert
CREATE POLICY "Messages are viewable by everyone" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send messages" ON messages FOR INSERT WITH CHECK (true);

-- Visitor counter: anyone can read and update
CREATE POLICY "Counter is viewable by everyone" ON visitor_counter FOR SELECT USING (true);
CREATE POLICY "Counter can be updated" ON visitor_counter FOR UPDATE USING (true);

-- ============================================
-- Enable Realtime for the tables
-- ============================================
-- Note: You may need to enable Realtime via the Supabase Dashboard
-- Go to Database > Replication > and add the tables you want to track.
