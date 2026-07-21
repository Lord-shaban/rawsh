// روش — الإقلاع والراوتر والشل
import { el, esc, nfmt, debounce, toast, sfx, soundOn, setSound } from './lib.js';
import { sb, store, api, profilesByIds, cachedProfile, startRealtime } from './sb.js';
import { avatarEl, icon, userRow, nameHTML } from './components.js';
import { feedPage, explorePage, notificationsPage, bookmarksPage, profilePage, postDetailPage, tagPage, notFoundPage } from './pages.js';
import { messagesPage } from './messages.js';
import { openComposer } from './compose.js';
import { renderAuth, openPasswordRecovery } from './auth.js';
import { openSettings, openEditProfile, applyTheme, getTheme, toggleTheme } from './settings.js';

const app = document.getElementById('app');
applyTheme(getTheme());

/* ============================================================
   الراوتر
   ============================================================ */
let pageCleanup = null;
let pageRoot = null;

const routes = [
  { re: /^$/, fn: feedPage },
  { re: /^explore$/, fn: explorePage },
  { re: /^notifications$/, fn: notificationsPage },
  { re: /^bookmarks$/, fn: bookmarksPage },
  { re: /^messages$/, fn: messagesPage },
  { re: /^messages\/([\w-]+)$/, fn: messagesPage, params: (m) => ({ id: m[1] }) },
  { re: /^u\/([\w.]+)$/, fn: profilePage, params: (m) => ({ username: m[1] }) },
  { re: /^p\/([\w-]+)$/, fn: postDetailPage, params: (m) => ({ id: m[1] }) },
  { re: /^tag\/(.+)$/, fn: tagPage, params: (m) => ({ tag: m[1] }) },
];

function currentPath() {
  return location.hash.replace(/^#\/?/, '').replace(/\/+$/, '');
}

function route() {
  if (!pageRoot) return;
  pageCleanup?.();
  pageCleanup = null;
  pageRoot.innerHTML = '';
  window.scrollTo(0, 0);

  const path = currentPath();
  let matched = null, params = {};
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) { matched = r; params = r.params ? r.params(m) : {}; break; }
  }
  const render = () => {
    const fn = matched ? matched.fn : notFoundPage;
    try { pageCleanup = fn(pageRoot, params) || null; }
    catch (err) { console.error(err); }
    updateNavActive();
  };
  if (document.startViewTransition) document.startViewTransition(render);
  else render();
}

function updateNavActive() {
  const path = currentPath();
  const key = path === '' ? 'home'
    : path.startsWith('explore') ? 'explore'
    : path.startsWith('notifications') ? 'notifications'
    : path.startsWith('messages') ? 'messages'
    : path.startsWith('bookmarks') ? 'bookmarks'
    : path === `u/${store.me?.username}` ? 'profile'
    : '';
  document.querySelectorAll('[data-nav]').forEach((n) => n.classList.toggle('active', n.dataset.nav === key));
}

/* ============================================================
   الشل
   ============================================================ */
function navItem(key, ico, label, href, badgeKey = null) {
  const item = el('a', { class: 'nav-item', href, dataset: { nav: key } });
  item.innerHTML = icon(ico) + `<span>${label}</span>`;
  if (badgeKey) {
    const b = el('span', { class: 'badge-dot hidden', dataset: { badge: badgeKey } });
    item.append(b);
  }
  return item;
}

function updateBadges() {
  document.querySelectorAll('[data-badge="notifs"]').forEach((b) => {
    b.classList.toggle('hidden', !store.unreadNotifs);
    b.textContent = store.unreadNotifs > 99 ? '99+' : store.unreadNotifs;
  });
  document.querySelectorAll('[data-badge="dms"]').forEach((b) => {
    b.classList.toggle('hidden', !store.unreadDMs);
    b.textContent = store.unreadDMs > 99 ? '99+' : store.unreadDMs;
  });
  const total = store.unreadNotifs + store.unreadDMs;
  document.title = (total ? `(${total}) ` : '') + 'روش — RAWSH';
}

function renderShell() {
  app.innerHTML = '';

  /* ---------- الهيدر ---------- */
  const searchInp = el('input', { class: 'input', placeholder: 'دوّر في روش…' });
  const searchDrop = el('div', { class: 'search-drop hidden' });
  const headerSearch = el('div', { class: 'header-search' }, searchInp, searchDrop);
  headerSearch.insertAdjacentHTML('afterbegin', icon('search'));

  const doHeadSearch = debounce(async () => {
    const qs = searchInp.value.trim();
    if (qs.length < 2) { searchDrop.classList.add('hidden'); return; }
    try {
      const users = await api.searchUsers(qs);
      searchDrop.innerHTML = '';
      users.slice(0, 5).forEach((u) => searchDrop.append(userRow(u, {
        withFollow: false,
        onClick: () => { searchDrop.classList.add('hidden'); searchInp.value = ''; location.hash = `#/u/${u.username}`; },
      })));
      searchDrop.append(el('button', {
        class: 'btn btn-sm btn-yl', style: { margin: '8px auto', display: 'flex' },
        text: `🔍 دوّر عن «${qs}» في كل حاجة`,
        onclick: () => {
          sessionStorage.setItem('rawsh_explore_q', qs);
          searchDrop.classList.add('hidden');
          searchInp.value = '';
          location.hash = '#/explore';
          if (currentPath() === 'explore') route();
        },
      }));
      searchDrop.classList.remove('hidden');
    } catch {}
  }, 350);
  searchInp.addEventListener('input', doHeadSearch);
  searchInp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInp.value.trim().length >= 2) {
      sessionStorage.setItem('rawsh_explore_q', searchInp.value.trim());
      searchDrop.classList.add('hidden');
      location.hash = '#/explore';
      if (currentPath() === 'explore') route();
    }
  });
  document.addEventListener('mousedown', (e) => {
    if (!headerSearch.contains(e.target)) searchDrop.classList.add('hidden');
  });

  const soundBtn = el('button', { class: 'btn btn-ghost btn-icon', html: icon(soundOn() ? 'volume' : 'volumeX'), title: 'الأصوات' });
  soundBtn.addEventListener('click', () => {
    setSound(!soundOn());
    soundBtn.innerHTML = icon(soundOn() ? 'volume' : 'volumeX');
    if (soundOn()) sfx.pop();
  });

  const themeBtn = el('button', { class: 'btn btn-ghost btn-icon', html: icon(getTheme() === 'dark' ? 'sun' : 'moon'), title: 'الوضع الليلي' });
  themeBtn.addEventListener('click', () => { toggleTheme(); themeBtn.innerHTML = icon(getTheme() === 'dark' ? 'sun' : 'moon'); });

  const streakChip = el('span', { class: 'streak-chip hidden', title: 'أيام النشر المتواصلة' });
  const renderStreak = () => {
    const s = store.me?.streak || 0;
    streakChip.classList.toggle('hidden', s < 2);
    streakChip.textContent = `🔥 ${s}`;
  };
  renderStreak();
  store.on('me', renderStreak);

  const avatarBtn = el('button', { class: 'btn-ghost', style: { border: 0, background: 'none', cursor: 'pointer', padding: 0 } }, avatarEl(store.me, 36, { link: false }));
  avatarBtn.addEventListener('click', async () => {
    const { dropMenu } = await import('./lib.js');
    dropMenu(avatarBtn, [
      { label: `@${store.me.username}`, icon: icon('user'), action: () => { location.hash = `#/u/${store.me.username}`; } },
      { label: 'المحفوظات', icon: icon('bookmark'), action: () => { location.hash = '#/bookmarks'; } },
      { label: 'عدّل بروفايلك', icon: icon('pencil'), action: () => openEditProfile() },
      { label: 'الإعدادات', icon: icon('gear'), action: () => openSettings() },
      '---',
      { label: 'تسجيل خروج', icon: icon('logout'), danger: true, action: async () => { await api.signOut(); location.reload(); } },
    ]);
  });

  const header = el('header', { class: 'header' },
    el('a', { class: 'logo', href: '#/', text: 'روش' }),
    headerSearch,
    el('div', { class: 'header-actions' }, streakChip, soundBtn, themeBtn, avatarBtn),
  );

  /* ---------- الماركيه ---------- */
  const marquee = el('div', { class: 'marquee' }, el('div', { class: 'marquee-track' }));
  loadMarquee(marquee.firstChild);

  /* ---------- النڤ ---------- */
  const composeBtn = el('button', { class: 'btn btn-or btn-lg nav-compose', html: icon('plus') + '<span>انشر ✦</span>' });
  composeBtn.addEventListener('click', () => openComposer({}));

  const nav = el('nav', { class: 'nav' },
    navItem('home', 'home', 'الرئيسية', '#/'),
    navItem('explore', 'compass', 'استكشف', '#/explore'),
    navItem('notifications', 'bell', 'الإشعارات', '#/notifications', 'notifs'),
    navItem('messages', 'send', 'الرسايل', '#/messages', 'dms'),
    navItem('bookmarks', 'bookmark', 'المحفوظات', '#/bookmarks'),
    navItem('profile', 'user', 'بروفايلك', `#/u/${store.me.username}`),
    composeBtn,
    el('div', { class: 'nav-foot' },
      el('a', { class: 'nav-item', href: '#', onclick: (e) => { e.preventDefault(); openSettings(); }, html: icon('gear') + '<span>الإعدادات</span>' }),
    ),
  );

  /* ---------- الودجتس ---------- */
  const widgets = el('aside', { class: 'widgets' });
  renderWidgets(widgets);

  /* ---------- الصفحة ---------- */
  pageRoot = el('main', { id: 'page' });

  /* ---------- بوتوم نڤ + FAB ---------- */
  const bottomnav = el('div', { class: 'bottomnav' },
    navItem('home', 'home', 'الرئيسية', '#/'),
    navItem('explore', 'compass', 'استكشف', '#/explore'),
    navItem('messages', 'send', 'الرسايل', '#/messages', 'dms'),
    navItem('notifications', 'bell', 'الإشعارات', '#/notifications', 'notifs'),
    navItem('profile', 'user', 'أنت', `#/u/${store.me.username}`),
  );
  const fab = el('button', { class: 'fab', html: icon('plus'), title: 'انشر' });
  fab.addEventListener('click', () => openComposer({}));

  app.append(el('div', { id: 'shell' },
    header, marquee,
    el('div', { class: 'main-grid' }, nav, pageRoot, widgets),
    bottomnav, fab,
  ));

  store.on('badges', updateBadges);
  updateBadges();
}

async function loadMarquee(track) {
  const phrases = [
    'مش مهم فيه كام، المهم شكله روش ✦',
    'كفاية تفكير خارج الصندوق… انشر جوّه روش 💿',
    'هو كل يوم بوست؟ أيوة، وده مدى الحياة 🔥',
    'ماتشرطش… حط لايك وخلاص 🪩',
  ];
  let tags = [];
  try { tags = await api.trendingTags(6); } catch {}
  const parts = [];
  phrases.forEach((p, i) => {
    parts.push(`<span>${esc(p)}</span>`);
    const t = tags[i];
    if (t) parts.push(`<span><a href="#/tag/${encodeURIComponent(t.tag)}">#${esc(t.tag)}</a> بيكسّر الدنيا (${nfmt(t.uses)}) 📈</span>`);
  });
  tags.slice(phrases.length).forEach((t) => {
    parts.push(`<span><a href="#/tag/${encodeURIComponent(t.tag)}">#${esc(t.tag)}</a> تريند 🔥</span>`);
  });
  const half = parts.join('<span>✦</span>');
  track.innerHTML = half + '<span>✦</span>' + half;
}

async function renderWidgets(widgets) {
  widgets.innerHTML = '';

  /* التريند */
  const trendBody = el('div', { class: 'widget-body chips' });
  const trendW = el('div', { class: 'sticker widget rot-1' },
    el('div', { class: 'widget-head', text: '📈 التريند دلوقتي' }), trendBody);
  widgets.append(trendW);
  try {
    const tags = await api.trendingTags(8);
    if (!tags.length) trendBody.append(el('span', { class: 'muted small', text: 'لسه مفيش ترندات… اعمل انت واحد #روش' }));
    tags.forEach((t, i) => trendBody.append(el('a', {
      class: 'chip ' + ['yl', 'pk', 'bl', 'or'][i % 4],
      href: `#/tag/${encodeURIComponent(t.tag)}`,
      html: `#${esc(t.tag)} <small>${nfmt(t.uses)}</small>`,
    })));
  } catch {}

  /* اقتراحات المتابعة */
  const sugBody = el('div', { class: 'widget-body', style: { padding: '6px' } });
  const sugW = el('div', { class: 'sticker widget rot1' },
    el('div', { class: 'widget-head', text: '✦ ناس روش' }), sugBody);
  widgets.append(sugW);
  try {
    const users = await api.whoToFollow(4);
    if (!users.length) sugBody.append(el('span', { class: 'muted small', style: { padding: '8px' }, text: 'هات صحابك هنا! 🎉' }));
    users.forEach((u) => sugBody.append(userRow(u)));
  } catch {}

  /* مين أونلاين */
  const onlineBody = el('div', { class: 'widget-body', style: { padding: '6px' } });
  const onlineW = el('div', { class: 'sticker widget rot-1' },
    el('div', { class: 'widget-head', text: '🟢 أونلاين دلوقتي' }), onlineBody);
  widgets.append(onlineW);
  const renderOnline = async () => {
    const ids = [...store.online].filter((id) => id !== store.me?.id).slice(0, 8);
    if (!ids.length) {
      onlineBody.innerHTML = '';
      onlineBody.append(el('span', { class: 'muted small', style: { padding: '8px' }, text: 'محدش أونلاين غيرك… انت الروش الوحيد 🌚' }));
      return;
    }
    try {
      const profs = await profilesByIds(ids);
      onlineBody.innerHTML = '';
      ids.forEach((id) => {
        const u = profs.get(id);
        if (u) onlineBody.append(userRow(u, { withFollow: false }));
      });
    } catch {}
  };
  renderOnline();
  store.on('presence', debounce(renderOnline, 800));

  widgets.append(el('div', { class: 'widget-foot', html: 'روش v1.0 · صنع بحب 🇪🇬 · <b>مش مهم فيه كام</b>' }));
}

/* ============================================================
   الإقلاع
   ============================================================ */
let booted = false;

async function bootApp() {
  if (booted) return;
  booted = true;
  try {
    await api.loadMe(store.session.user.id);
    await api.loadFollowing();
    startRealtime();
    api.refreshNotifBadge();
    api.conversations().catch(() => {});
    renderShell();
    route();
  } catch (err) {
    console.error(err);
    booted = false;
    app.innerHTML = '';
    app.append(el('div', { class: 'boot' },
      el('div', { style: { fontSize: '54px' }, text: '📡' }),
      el('div', { class: 'disp-b', style: { fontSize: '20px' }, text: 'مش قادرين نوصل للسيرفر' }),
      el('button', { class: 'btn btn-or', text: 'جرب تاني 🔁', onclick: () => location.reload() }),
    ));
  }
}

function showAuth() {
  booted = false;
  pageRoot = null;
  renderAuth(app, {
    onAuthed: async () => {
      const { data } = await sb.auth.getSession();
      store.session = data.session;
      if (store.session) bootApp();
    },
  });
}

window.addEventListener('hashchange', route);

sb.auth.onAuthStateChange((event, session) => {
  store.session = session;
  if (event === 'PASSWORD_RECOVERY') {
    if (!booted && session) bootApp().then(() => openPasswordRecovery());
    else openPasswordRecovery();
    return;
  }
  if (event === 'SIGNED_IN' && session && !booted) bootApp();
  if (event === 'SIGNED_OUT') { booted = false; showAuth(); }
});

(async () => {
  const { data } = await sb.auth.getSession();
  store.session = data.session;
  if (store.session) bootApp();
  else showAuth();
})();

/* PWA */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
