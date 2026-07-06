// ============================================
// iCHAT — Supabase Configuration
// Replace these with your Supabase project keys
// ============================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // e.g. https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // e.g. eyJhbGciOiJIUzI1NiIs...

// ============================================
// Chat Rooms Configuration
// ============================================
const CHAT_ROOMS = [
    { id: 'general',  name: '💬 General Chat',   description: 'The main hangout — talk about anything!',                icon: '💬', maxUsers: 50 },
    { id: 'tech',     name: '💻 Tech Talk',       description: 'Computers, coding, and the information superhighway',    icon: '💻', maxUsers: 50 },
    { id: 'gaming',   name: '🎮 Game Room',       description: 'Video games, cheat codes, and high scores',              icon: '🎮', maxUsers: 50 },
    { id: 'music',    name: '🎵 Music Lounge',    description: 'Share your favorite tunes and mixtapes',                 icon: '🎵', maxUsers: 50 },
    { id: 'random',   name: '🌀 Random',          description: 'Anything goes! The wild west of chat.',                  icon: '🌀', maxUsers: 50 },
];

// ============================================
// Avatar Options
// ============================================
const AVATARS = [
    { id: 'robot',   emoji: '🤖', name: 'Robot' },
    { id: 'alien',   emoji: '👾', name: 'Alien' },
    { id: 'cat',     emoji: '🐱', name: 'Cat' },
    { id: 'gamer',   emoji: '🎮', name: 'Gamer' },
    { id: 'skull',   emoji: '💀', name: 'Skull' },
    { id: 'star',    emoji: '🌟', name: 'Star' },
    { id: 'fire',    emoji: '🔥', name: 'Fire' },
    { id: 'fox',     emoji: '🦊', name: 'Fox' },
];

// ============================================
// User Text Color Options
// ============================================
const TEXT_COLORS = [
    '#00FF41', // Neon Green
    '#FF00FF', // Neon Pink
    '#00FFFF', // Neon Cyan
    '#FFD700', // Neon Yellow
    '#FF6600', // Neon Orange
    '#9B59B6', // Purple
    '#0066FF', // Blue
    '#FF4444', // Red
    '#FFFFFF', // White
    '#FF69B4', // Hot Pink
    '#7FFF00', // Chartreuse
    '#FF1493', // Deep Pink
];

// ============================================
// Marquee Messages
// ============================================
const MARQUEE_MESSAGES = [
    '★ Welcome to iCHAT — The Retro Chat Experience! ★',
    '🚀 Powered by the Information Superhighway!',
    '💾 Remember to save your chat logs!',
    '📡 Connected at 56kbps... just kidding, we\'re on fiber!',
    '🌐 Best viewed in Netscape Navigator 4.0',
    '⚡ No Java applets were harmed in the making of this chat',
    '🎵 Now playing: Darude - Sandstorm',
    '📧 You\'ve Got Mail! ...wait, wrong app',
];

// ============================================
// Application Settings
// ============================================
const APP_CONFIG = {
    messagesPerLoad: 50,           // Messages to load from history
    maxScreenNameLength: 16,       // Max characters for screen name
    minScreenNameLength: 2,        // Min characters for screen name
    maxMessageLength: 500,         // Max characters per message
    typingTimeout: 3000,           // Typing indicator timeout (ms)
    reconnectDelay: 3000,          // WebSocket reconnect delay (ms)
    marqueeSpeed: 20,              // Marquee scroll speed (seconds)
};
