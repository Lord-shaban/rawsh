/* ============================================
   iCHAT — Emoji Picker
   ============================================ */

const EmojiPicker = {
  categories: [
    { id: 'smileys', icon: '😊', label: 'Smileys' },
    { id: 'gestures', icon: '👋', label: 'Gestures' },
    { id: 'hearts', icon: '❤️', label: 'Hearts' },
    { id: 'animals', icon: '🐱', label: 'Animals' },
    { id: 'food', icon: '🍕', label: 'Food' },
    { id: 'travel', icon: '✈️', label: 'Travel' },
    { id: 'objects', icon: '💡', label: 'Objects' },
    { id: 'symbols', icon: '⭐', label: 'Symbols' },
  ],

  emojis: {
    smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
    gestures: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','🫦'],
    hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫶','😍','🥰','😘','💑','💏','💋'],
    animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘'],
    food: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊'],
    travel: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛹','🛼','🚁','🛩️','✈️','🛫','🛬','🪂','💺','🚀','🛸','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🗺️','🗿','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','🛖','🏠','🏡','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛️','⛪','🕌','🕍','🛕','🕋','⛩️','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🌌'],
    objects: ['💡','🔦','🕯️','🧯','💰','💴','💵','💶','💷','🪙','💸','💳','🧾','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','🩻','🩼','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️','🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧','💌','📥','📤','📦','🏷️','🪧','📪','📫','📬','📭','📮','📯','📜','📃','📄','📑','🧾','📊','📈','📉','🗒️','🗓️','📆','📅','🗑️','📇','🗃️','🗳️','🗄️','📋','📁','📂','🗂️','🗞️','📰','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🧷','🔗','📎','🖇️','📐','📏','🧮','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎'],
    symbols: ['⭐','🌟','✨','💫','⚡','🔥','💥','☀️','🌤️','⛅','🌥️','🌦️','🌧️','⛈️','🌩️','🌪️','🌫️','🌬️','🌀','🌈','☁️','❄️','☃️','⛄','☄️','💧','🌊','🎵','🎶','🎼','🎹','🥁','🎷','🎺','🪗','🎸','🪕','🎻','🪘','🎯','🎱','🎲','🎰','🧩','🎮','🕹️','🎳','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','✅','❌','❓','❗','‼️','⁉️','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔘','🔲','🔳','◻️','◼️','▫️','▪️','🔷','🔶','🔹','🔸','💠','🔻','🔺','♠️','♣️','♥️','♦️','🃏','🀄','🔇','🔈','🔉','🔊','📢','📣','📯','🔔','🔕','🎃','🎄','🎆','🎇','🧨','✨','🎈','🎉','🎊','🎋','🎍','🎎','🎏','🎐','🎑','🧧']
  },

  currentCategory: 'smileys',
  isOpen: false,
  onSelect: null,

  init(onSelectCallback) {
    this.onSelect = onSelectCallback;
    this.renderCategories();
    this.renderEmojis('smileys');
    this.bindEvents();
  },

  renderCategories() {
    const container = document.getElementById('emojiCategories');
    if (!container) return;

    container.innerHTML = this.categories.map(cat => 
      `<button class="emoji-picker__cat-btn ${cat.id === this.currentCategory ? 'emoji-picker__cat-btn--active' : ''}" 
              data-category="${cat.id}" title="${cat.label}">${cat.icon}</button>`
    ).join('');
  },

  renderEmojis(category) {
    const container = document.getElementById('emojiGrid');
    if (!container) return;

    const emojis = this.emojis[category] || [];
    container.innerHTML = emojis.map(emoji => 
      `<button class="emoji-picker__emoji" data-emoji="${emoji}">${emoji}</button>`
    ).join('');
    
    this.currentCategory = category;
  },

  bindEvents() {
    // Category buttons
    const catContainer = document.getElementById('emojiCategories');
    if (catContainer) {
      catContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.emoji-picker__cat-btn');
        if (!btn) return;
        
        // Update active
        catContainer.querySelectorAll('.emoji-picker__cat-btn').forEach(b => 
          b.classList.remove('emoji-picker__cat-btn--active'));
        btn.classList.add('emoji-picker__cat-btn--active');
        
        this.renderEmojis(btn.dataset.category);
      });
    }

    // Emoji selection
    const grid = document.getElementById('emojiGrid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.emoji-picker__emoji');
        if (!btn) return;
        
        if (this.onSelect) {
          this.onSelect(btn.dataset.emoji);
        }
      });
    }

    // Search
    const search = document.getElementById('emojiSearch');
    if (search) {
      search.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          this.renderEmojis(this.currentCategory);
          return;
        }
        
        // Search across all categories
        const allEmojis = Object.values(this.emojis).flat();
        const grid = document.getElementById('emojiGrid');
        grid.innerHTML = allEmojis.map(emoji => 
          `<button class="emoji-picker__emoji" data-emoji="${emoji}">${emoji}</button>`
        ).join('');
      });
    }
  },

  toggle() {
    const picker = document.getElementById('emojiPicker');
    if (!picker) return;
    
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      picker.classList.add('emoji-picker--open');
    } else {
      picker.classList.remove('emoji-picker--open');
    }
  },

  close() {
    const picker = document.getElementById('emojiPicker');
    if (!picker) return;
    
    this.isOpen = false;
    picker.classList.remove('emoji-picker--open');
  }
};
