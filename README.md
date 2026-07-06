# 🖥️ iCHAT — The Retro Chat Experience

> A real-time chat application with an authentic 90s retro design. Built with vanilla HTML, CSS, and JavaScript. Powered by Supabase for real-time messaging and hosted on Cloudflare Pages.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=flat&logo=cloudflare&logoColor=white)

## ✨ Features

- 💬 **Real-time Chat** — Instant messaging powered by Supabase Realtime
- 🖥️ **Windows 95 Design** — Authentic retro UI with beveled buttons, window frames, and title bars
- 👥 **Buddy List** — See who's online with live presence tracking
- 🏠 **Chat Lobby** — AOL-inspired welcome screen with room selection
- 🎨 **Customization** — Pick your avatar, screen name, and text color
- 🔊 **Retro Sound Effects** — Synthesized 8-bit sounds (message, join, leave, dial-up)
- 📺 **CRT Scanlines** — Optional CRT monitor effect overlay
- ⌨️ **Chat Commands** — `/me`, `/roll`, `/flip`, `/whisper`, `/color`, `/help`
- 😊 **Emoji Support** — Text emoticons auto-convert to emoji
- 📱 **Responsive** — Works on desktop, tablet, and mobile
- 🆓 **100% Free** — No server costs, no subscriptions

## 🏗️ Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | HTML5 + CSS3 + Vanilla JS | Free |
| Backend | Supabase (PostgreSQL + Realtime) | Free tier |
| Hosting | Cloudflare Pages | Free |
| Fonts | Google Fonts (Press Start 2P, VT323) | Free |
| Sounds | Web Audio API (no external files) | Free |

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/ichat.git
cd ichat
```

### 2. Setup Supabase
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and run the contents of `schema.sql`
4. Go to **Project Settings > API** and copy your:
   - Project URL
   - `anon` public key

### 3. Configure the app
Edit `js/config.js` and replace the placeholders:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 4. Run locally
Simply open `index.html` in your browser — no build step needed!

### 5. Deploy to Cloudflare Pages
1. Push your code to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > Pages
3. Create a project and connect your GitHub repo
4. Set **Build output directory** to `/` (root)
5. Deploy!

## 📁 Project Structure

```
ICHAT/
├── index.html          # Login page
├── lobby.html          # Room selection lobby
├── chat.html           # Chat room
├── schema.sql          # Supabase database schema
├── css/
│   ├── reset.css       # CSS reset
│   ├── design-tokens.css # Colors, fonts, spacing
│   ├── windows95.css   # Win95 components
│   ├── effects.css     # CRT, glow, marquee
│   ├── login.css       # Login page styles
│   ├── lobby.css       # Lobby page styles
│   ├── chat.css        # Chat page styles
│   └── responsive.css  # Mobile responsive
└── js/
    ├── config.js       # Configuration & constants
    ├── supabase-client.js # Database helpers
    ├── auth.js         # Login/session management
    ├── lobby.js        # Lobby page logic
    ├── chat.js         # Chat page logic
    ├── realtime.js     # Supabase Realtime
    ├── commands.js     # Chat commands
    ├── emoji.js        # Emoji parser
    ├── sounds.js       # Sound effects
    ├── clock.js        # Digital clock
    ├── drag.js         # Draggable windows
    └── settings.js     # User preferences
```

## 💬 Chat Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/me [action]` | Action message (*User is coding...*) |
| `/roll [max]` | Roll a dice (default 1-6) |
| `/flip` | Flip a coin |
| `/whisper [user] [msg]` | Private message |
| `/color #RRGGBB` | Change your text color |
| `/away [message]` | Set away status |
| `/back` | Return from away |
| `/shrug` | ¯\\_(ツ)_/¯ |
| `/tableflip` | (╯°□°)╯︵ ┻━┻ |
| `/clear` | Clear chat locally |

## 📝 License

MIT License — Feel free to fork, modify, and share!

---

<p align="center">
  <em>Best viewed in Netscape Navigator 4.0 @ 800x600</em><br>
  <strong>🚧 Under Construction 🚧</strong>
</p>
