// روش — أدوات عامة: DOM، وقت، توست، مودال، أصوات، ضغط صور

/* ---------- DOM ---------- */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(9)) {
    if (c == null || c === false) continue;
    n.append(c.nodeType ? c : document.createTextNode(c));
  }
  return n;
}

/* ---------- نصوص آمنة ---------- */
export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// تحويل الروابط والهاشتاجات والمنشنات لعناصر قابلة للضغط (بعد التأمين)
export function linkify(text = '') {
  const urlRe = /(https?:\/\/[^\s<>"']+)/g;
  return String(text).split(urlRe).map((part, i) => {
    if (i % 2 === 1) {
      const shown = part.replace(/^https?:\/\//, '');
      return `<a href="${esc(part)}" target="_blank" rel="noopener noreferrer" data-ext>${esc(shown.length > 42 ? shown.slice(0, 42) + '…' : shown)}</a>`;
    }
    let t = esc(part);
    t = t.replace(/#([A-Za-z0-9_ء-ي٠-٩]+)/g,
      (m, tag) => `<a href="#/tag/${encodeURIComponent(tag.toLowerCase())}">#${tag}</a>`);
    t = t.replace(/@([A-Za-z0-9_]{3,20})/g,
      (m, u) => `<a href="#/u/${u.toLowerCase()}">@${u}</a>`);
    return t;
  }).join('');
}

/* ---------- وقت وأرقام ---------- */
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function timeAgo(iso) {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 50) return 'دلوقتي';
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} د`;
  if (s < 86400) return `${Math.floor(s / 3600)} س`;
  const days = Math.floor(s / 86400);
  if (days === 1) return 'امبارح';
  if (days < 7) return `${days} أيام`;
  const dd = `${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? dd : `${dd} ${d.getFullYear()}`;
}

export function fullTime(iso) {
  try { return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' }); }
  catch { return new Date(iso).toLocaleString(); }
}

export function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const diff = (today - that) / 86400000;
  if (diff === 0) return 'النهارده';
  if (diff === 1) return 'امبارح';
  return `${that.getDate()} ${AR_MONTHS[that.getMonth()]}`;
}

export function nfmt(n) {
  n = Number(n) || 0;
  if (n < 1000) return String(n);
  if (n < 1e6) {
    const v = n / 1000;
    return (v < 10 ? v.toFixed(1) : Math.round(v)).toString().replace(/\.0$/, '') + ' ألف';
  }
  return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' مليون';
}

/* ---------- أدوات ---------- */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function throttle(fn, ms = 400) {
  let last = 0, timer;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
    else { clearTimeout(timer); timer = setTimeout(() => { last = Date.now(); fn(...args); }, ms - (now - last)); }
  };
}

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = el('textarea', { style: { position: 'fixed', opacity: 0 } });
    ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
    return true;
  }
}

export function autoResize(t) {
  const fit = () => { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 320) + 'px'; };
  t.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return fit;
}

/* لون ثابت من الاسم — للأفاتارات الافتراضية */
const AV_COLORS = ['#ff4d00', '#f43d97', '#2b50ff', '#8b5cf6', '#00b8c4', '#0aa55c', '#e8442e', '#d97706'];
export function hashColor(str = '?') {
  let h = 0;
  for (const c of String(str)) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

/* نجمة البورست SVG */
export function burstSVG(color = 'var(--pk)', points = 14, size = 220) {
  const cx = 100, cy = 100, r1 = 100, r2 = 46;
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  const s = el('div', { class: 'burst', style: { width: size + 'px', height: size + 'px' } });
  s.innerHTML = `<svg viewBox="0 0 200 200" width="100%" height="100%"><path d="${d}Z" fill="${color}"/></svg>`;
  return s;
}

/* ---------- أصوات ريترو خفيفة ---------- */
let actx = null;
export const soundOn = () => localStorage.getItem('rawsh_sound') !== 'off';
export function setSound(on) { localStorage.setItem('rawsh_sound', on ? 'on' : 'off'); }

function tone(freq, dur = 0.09, type = 'square', gain = 0.035, delay = 0, slideTo = null) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch {}
}

export const sfx = {
  like()  { if (soundOn()) { tone(620, .07, 'square'); tone(930, .09, 'square', .03, .06); } },
  pop()   { if (soundOn()) tone(480, .06, 'triangle', .05); },
  send()  { if (soundOn()) tone(320, .16, 'sine', .05, 0, 780); },
  msg()   { if (soundOn()) tone(700, .09, 'sine', .045); },
  notif() { if (soundOn()) { tone(880, .09, 'sine', .04); tone(660, .12, 'sine', .04, .1); } },
  err()   { if (soundOn()) tone(150, .2, 'sawtooth', .04); },
};

/* ---------- توست ---------- */
export function toast(msg, { emoji = '✦', color = 'var(--or)', ms = 3600, onClick } = {}) {
  const root = $('#toasts');
  if (!root) return;
  const t = el('div', { class: 'toast', style: { '--tc': color } },
    el('span', { class: 't-emoji', text: emoji }),
    el('span', { class: 'grow', text: msg }),
  );
  const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 260); };
  t.addEventListener('click', () => { if (onClick) onClick(); kill(); });
  root.append(t);
  while (root.children.length > 4) root.firstChild.remove();
  setTimeout(kill, ms);
  return t;
}

export const toastErr = (msg = 'حصلت مشكلة… جرب تاني') => { sfx.err(); toast(msg, { emoji: '💥', color: 'var(--rd)' }); };

/* ---------- مودال ---------- */
let escStack = [];
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && escStack.length) escStack[escStack.length - 1]();
});

export function modal({ title = '', content, wide = false, barClass = '', onClose } = {}) {
  const root = $('#overlays');
  const win = el('div', { class: 'win' + (wide ? ' wide' : '') });
  const ov = el('div', { class: 'overlay' }, win);
  const close = () => {
    if (!ov.isConnected) return;
    ov.remove();
    escStack = escStack.filter((f) => f !== close);
    if (!root.children.length) document.documentElement.style.overflow = '';
    if (onClose) onClose();
  };
  const bar = el('div', { class: 'win-bar ' + barClass },
    el('div', { class: 'win-dots' }, el('i'), el('i'), el('i')),
    el('div', { class: 'win-title', text: title }),
    el('button', { class: 'win-x', text: '✕', onclick: close, 'aria-label': 'قفل' }),
  );
  const body = el('div', { class: 'win-body' });
  if (content) body.append(content);
  win.append(bar, body);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
  root.append(ov);
  document.documentElement.style.overflow = 'hidden';
  escStack.push(close);
  return { close, body, win, bar };
}

export function confirmDlg(text, { okText = 'أيوة متأكد', cancelText = 'لأ خلاص', danger = true, title = 'متأكد؟' } = {}) {
  return new Promise((resolve) => {
    // نحسم النتيجة مرة واحدة بس — قفل المودال بيستدعي onClose اللي كان بيسبق resolve(true) ويحسمها false بالغلط
    let settled = false;
    const done = (val) => { if (settled) return; settled = true; resolve(val); m.close(); };
    const content = el('div', {},
      el('p', { style: { margin: '0 0 18px', fontWeight: 600, fontSize: '15.5px' }, text: text }),
      el('div', { class: 'hstack', style: { justifyContent: 'flex-end' } },
        el('button', { class: 'btn', text: cancelText, onclick: () => done(false) }),
        el('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-or'), text: okText, onclick: () => done(true) }),
      ),
    );
    const m = modal({ title, content, onClose: () => done(false) });
  });
}

/* ---------- لايت بوكس ---------- */
export function lightbox(items, startIdx = 0) {
  let idx = startIdx;
  const stage = el('div', { class: 'center', style: { width: '100%', height: '100%' } });
  const count = el('div', { class: 'lb-count' });
  const render = () => {
    stage.innerHTML = '';
    const it = items[idx];
    stage.append(it.type === 'video'
      ? el('video', { src: it.url, controls: true, autoplay: true, playsinline: true })
      : el('img', { src: it.url, alt: '' }));
    count.textContent = `${idx + 1} / ${items.length}`;
    count.style.display = items.length > 1 ? '' : 'none';
  };
  const lb = el('div', { class: 'lightbox' }, stage, count);
  const close = () => { lb.remove(); escStack = escStack.filter((f) => f !== close); };
  lb.append(el('button', { class: 'btn btn-icon lb-x', html: '✕', onclick: close }));
  if (items.length > 1) {
    lb.append(
      el('button', { class: 'btn btn-icon lb-nav next', html: '‹', onclick: (e) => { e.stopPropagation(); idx = (idx + 1) % items.length; render(); } }),
      el('button', { class: 'btn btn-icon lb-nav prev', html: '›', onclick: (e) => { e.stopPropagation(); idx = (idx - 1 + items.length) % items.length; render(); } }),
    );
  }
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target === stage) close(); });
  escStack.push(close);
  render();
  document.body.append(lb);
}

/* ---------- ضغط الصور ---------- */
export async function compressImage(file, maxW = 1600, quality = 0.85) {
  if (!/^image\//.test(file.type) || file.type === 'image/gif') {
    return { blob: file, w: 0, h: 0, type: file.type, ext: (file.name.split('.').pop() || 'bin').toLowerCase() };
  }
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxW / bmp.width);
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
    bmp.close?.();
    if (!blob) throw new Error('toBlob failed');
    return { blob, w, h, type: 'image/jpeg', ext: 'jpg' };
  } catch {
    return { blob: file, w: 0, h: 0, type: file.type, ext: (file.name.split('.').pop() || 'jpg').toLowerCase() };
  }
}

export function pickFile(accept, multiple = false) {
  return new Promise((resolve) => {
    const inp = el('input', { type: 'file', accept, style: { display: 'none' } });
    if (multiple) inp.multiple = true;
    inp.addEventListener('change', () => resolve(multiple ? [...inp.files] : inp.files[0] || null));
    document.body.append(inp);
    inp.click();
    setTimeout(() => inp.remove(), 60000);
  });
}

/* ---------- إيموجي ---------- */
export const EMOJIS = [
  '😂','🤣','❤️','🔥','😍','🥹','😭','💀','👀','✨','🎉','😎','🫡','🫠','🙏','👍','👌','💯','😤','🤝',
  '😉','😅','😇','🤔','🙄','😴','🤯','🥵','🥶','😱','🤡','👻','💅','🦾','🧠','🍉','☕','🍕','🐫','🌚',
  '⭐','⚡','💫','🌈','🎯','🏆','🎮','📸','🎬','🎧','💿','📟','☎️','💾','🖥️','🕹️','💸','💰','🪩','🎲',
  '✌️','🤞','👑','💎','🚀','🛵','🏖️','🌊','🌴','😋','🤤','😐','😑','🫤','😬','🤐','🤫','😷','🥳','😜',
];

export function emojiPicker(anchorEl, onPick) {
  const pop = el('div', { class: 'emoji-pop' });
  for (const e of EMOJIS) {
    pop.append(el('button', { text: e, type: 'button', onclick: (ev) => { ev.stopPropagation(); onPick(e); } }));
  }
  document.body.append(pop);
  const r = anchorEl.getBoundingClientRect();
  const w = 300, margin = 10;
  let left = Math.min(Math.max(margin, r.left - w / 2 + r.width / 2), window.innerWidth - w - margin);
  let top = r.bottom + 8;
  if (top + 270 > window.innerHeight) top = Math.max(margin, r.top - 278);
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  const closer = (ev) => { if (!pop.contains(ev.target) && ev.target !== anchorEl) { pop.remove(); document.removeEventListener('mousedown', closer); } };
  setTimeout(() => document.addEventListener('mousedown', closer), 10);
  return pop;
}

/* قائمة منسدلة عامة */
export function dropMenu(anchorEl, items) {
  const menu = el('div', { class: 'menu' });
  const close = () => { menu.remove(); document.removeEventListener('mousedown', closer); };
  for (const it of items) {
    if (it === '---') { menu.append(el('hr')); continue; }
    menu.append(el('button', {
      class: it.danger ? 'danger' : '',
      html: (it.icon || '') + `<span>${esc(it.label)}</span>`,
      onclick: () => { close(); it.action?.(); },
    }));
  }
  document.body.append(menu);
  const r = anchorEl.getBoundingClientRect();
  const mw = Math.max(190, menu.offsetWidth);
  let left = Math.min(Math.max(8, r.left + r.width / 2 - mw / 2), window.innerWidth - mw - 8);
  let top = r.bottom + 6;
  if (top + menu.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - menu.offsetHeight - 6);
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  const closer = (ev) => { if (!menu.contains(ev.target)) close(); };
  setTimeout(() => document.addEventListener('mousedown', closer), 10);
  return { close };
}
