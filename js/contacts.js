/* ============================================
   iCHAT — Contacts Manager
   ============================================ */

const ContactsManager = {
  contacts: [
    {
      id: 'sarah',
      name: 'Sarah Ahmed',
      avatar: 'S',
      avatarColor: 'linear-gradient(135deg, #ec4899, #f43f5e)',
      status: 'online',
      statusText: 'Online',
      lastSeen: null,
      bio: 'Coffee lover ☕ | Designer',
      responses: [
        "That's awesome! 🎉",
        "I totally agree with you!",
        "Haha, that's so funny 😂",
        "Let me think about it...",
        "Sounds like a plan! 👍",
        "Have you tried the new update?",
        "I love that idea! ✨",
        "Can you send me more details?",
        "That's really cool!",
        "I'll get back to you on that 🤔"
      ]
    },
    {
      id: 'omar',
      name: 'Omar Hassan',
      avatar: 'O',
      avatarColor: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
      status: 'online',
      statusText: 'Online',
      lastSeen: null,
      bio: 'Software Developer 💻',
      responses: [
        "Hey! What's up? 👋",
        "That code looks great!",
        "Have you checked the latest commit?",
        "Let's debug this together 🐛",
        "I pushed the fix already",
        "The API is working now! 🚀",
        "Check the documentation first",
        "We should refactor that module",
        "Nice work on the feature! 💪",
        "Let's schedule a code review"
      ]
    },
    {
      id: 'layla',
      name: 'Layla Mahmoud',
      avatar: 'L',
      avatarColor: 'linear-gradient(135deg, #a78bfa, #6366f1)',
      status: 'away',
      statusText: 'Away',
      lastSeen: '2 hours ago',
      bio: 'Photographer 📸',
      responses: [
        "Beautiful! 📸",
        "I just took some amazing shots today!",
        "The lighting was perfect ✨",
        "Can I share some photos with you?",
        "Which filter do you like better?",
        "I'm editing some photos right now",
        "Nature shots are my favorite 🌿",
        "Thanks for the feedback!",
        "I'll send you the portfolio later",
        "Check out my latest collection! 🎨"
      ]
    },
    {
      id: 'ahmed',
      name: 'Ahmed Ali',
      avatar: 'A',
      avatarColor: 'linear-gradient(135deg, #34d399, #22c55e)',
      status: 'online',
      statusText: 'Online',
      lastSeen: null,
      bio: 'Fitness & Health 💪',
      responses: [
        "Let's hit the gym! 💪",
        "My workout was intense today",
        "Have you tried this protein shake?",
        "Rest day is important too!",
        "5K run this morning was great 🏃",
        "Diet is 80% of the results",
        "New personal record! 🎯",
        "Consistency is the key 🔑",
        "Morning workouts are the best!",
        "Let's do a challenge together!"
      ]
    },
    {
      id: 'nour',
      name: 'Nour El-Din',
      avatar: 'N',
      avatarColor: 'linear-gradient(135deg, #f59e0b, #ef4444)',
      status: 'offline',
      statusText: 'Offline',
      lastSeen: 'Yesterday',
      bio: 'Music Producer 🎵',
      responses: [
        "Listen to this beat! 🎵",
        "I just finished a new track",
        "The bass needs more punch 🔊",
        "Studio session tomorrow?",
        "Which DAW do you prefer?",
        "This melody is stuck in my head",
        "Mixing takes forever but worth it",
        "Just dropped a new single! 🎶",
        "The vocals sound incredible",
        "Let's collab on something! 🎤"
      ]
    },
    {
      id: 'mona',
      name: 'Mona Karim',
      avatar: 'M',
      avatarColor: 'linear-gradient(135deg, #f43f5e, #ec4899)',
      status: 'online',
      statusText: 'Online',
      lastSeen: null,
      bio: 'UX Researcher 🔍',
      responses: [
        "The user research results are in! 📊",
        "We need more usability testing",
        "Great user feedback today!",
        "The prototype looks promising",
        "Let's run an A/B test 🧪",
        "User satisfaction is up 30%! 📈",
        "I created a new survey",
        "The heatmaps are interesting",
        "We should do more interviews",
        "Data-driven decisions are the best 💡"
      ]
    }
  ],

  // Initial messages for each contact
  initialMessages: {
    sarah: [
      { text: "Hey! How are you? 😊", sent: false, time: '09:30 AM' },
      { text: "I'm great! Just working on a new project", sent: true, time: '09:32 AM' },
      { text: "That's awesome! What kind of project? 🎉", sent: false, time: '09:33 AM' },
    ],
    omar: [
      { text: "Did you push the latest changes?", sent: false, time: '10:15 AM' },
      { text: "Yes, just merged to main branch", sent: true, time: '10:17 AM' },
      { text: "The API is working now! 🚀", sent: false, time: '10:18 AM' },
    ],
    layla: [
      { text: "Check out this sunset photo! 🌅", sent: false, time: '08:45 AM' },
      { text: "Wow, that's stunning!", sent: true, time: '08:50 AM' },
    ],
    ahmed: [
      { text: "Morning workout done! 💪", sent: false, time: '06:30 AM' },
    ],
    nour: [
      { text: "Hey, when are you free to chat?", sent: true, time: 'Yesterday' },
    ],
    mona: [
      { text: "The new design looks incredible! ✨", sent: false, time: '11:00 AM' },
      { text: "Thanks! I spent a lot of time on it", sent: true, time: '11:05 AM' },
      { text: "It really shows. Great work! 👏", sent: false, time: '11:06 AM' },
    ]
  },

  getAll() {
    return this.contacts;
  },

  getById(id) {
    return this.contacts.find(c => c.id === id);
  },

  getInitialMessages(contactId) {
    return this.initialMessages[contactId] || [];
  },

  getRandomResponse(contactId) {
    const contact = this.getById(contactId);
    if (!contact) return "Hello!";
    const responses = contact.responses;
    return responses[Math.floor(Math.random() * responses.length)];
  },

  getLastMessage(contactId) {
    // Check storage first
    const stored = Storage.getMessages(contactId);
    if (stored.length > 0) {
      return stored[stored.length - 1];
    }
    // Fall back to initial messages
    const initial = this.initialMessages[contactId];
    if (initial && initial.length > 0) {
      return initial[initial.length - 1];
    }
    return null;
  },

  getUnreadCount(contactId) {
    // Simulate unread counts
    const counts = { sarah: 2, omar: 1, mona: 3, layla: 0, ahmed: 0, nour: 0 };
    return counts[contactId] || 0;
  }
};
