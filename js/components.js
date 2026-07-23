// روش — مكونات مشتركة: أيقونات، أفاتار، كارت البوست، صفوف ناس
import { el, esc, linkify, timeAgo, fullTime, nfmt, hashColor, toast, toastErr, sfx, dropMenu, confirmDlg, lightbox, copy, debounce, modal } from './lib.js';
import { store, api, arErr } from './sb.js';

/* ---------- أيقونات ---------- */
const P = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const ICONS = {
  home: P('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/>'),
  compass: P('<circle cx="12" cy="12" r="9"/><path d="m14.8 9.2-1.7 5-3.9 1.4 1.7-5z"/>'),
  bell: P('<path d="M6 9.5a6 6 0 0 1 12 0c0 4.8 2 6 2 6H4s2-1.2 2-6"/><path d="M10 19.5a2.2 2.2 0 0 0 4 0"/>'),
  send: P('<path d="m3.5 11 17-7-7 17-2.4-7.6L3.5 11Z"/>'),
  bookmark: P('<path d="M6.5 4h11v16.5l-5.5-3.8-5.5 3.8Z"/>'),
  user: P('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-3.8 4.2-5.5 7.5-5.5s6.5 1.7 7.5 5.5"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  heart: P('<path d="M12 20s-7.6-4.8-9.3-9.1A5.2 5.2 0 0 1 12 6.4a5.2 5.2 0 0 1 9.3 4.5C19.6 15.2 12 20 12 20Z"/>'),
  comment: P('<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3.5l1.8-3.4A8.5 8.5 0 1 1 21 11.5Z"/>'),
  repeat: P('<path d="m17 2.5 4 4-4 4"/><path d="M3 11V9.5a3 3 0 0 1 3-3h15"/><path d="m7 21.5-4-4 4-4"/><path d="M21 13v1.5a3 3 0 0 1-3 3H3"/>'),
  share: P('<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 13v7h14v-7"/>'),
  eye: P('<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>'),
  x: P('<path d="m5 5 14 14M19 5 5 19"/>'),
  check: P('<path d="m4 12.5 5.5 5.5L20 6.5"/>'),
  gear: P('<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>'),
  logout: P('<path d="M14 5V4H5v16h9v-1"/><path d="M9 12h12m0 0-3.5-3.5M21 12l-3.5 3.5"/>'),
  image: P('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 3 3 4-4 4 4"/>'),
  poll: P('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  smile: P('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>'),
  search: P('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5"/>'),
  more: P('<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>'),
  trash: P('<path d="M4 7h16M9.5 7V4h5v3M6.5 7l1 13h9l1-13"/>'),
  pencil: P('<path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z"/>'),
  link: P('<path d="m9 15 6-6M7.5 12.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M16.5 11.5l2-2a3.5 3.5 0 0 0-5-5l-2 2"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>'),
  moon: P('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>'),
  volume: P('<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>'),
  volumeX: P('<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z"/><path d="m16.5 9.5 5 5m0-5-5 5"/>'),
  camera: P('<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="14" r="3.5"/>'),
  back: P('<path d="M4 12h16m0 0-5-5m5 5-5 5"/>'),
  video: P('<rect x="2.5" y="6" width="14" height="12" rx="3"/><path d="m16.5 12 5-3.5v7z"/>'),
  reply: P('<path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 5 5v1"/>'),
  copy: P('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  chevronDown: P('<path d="m5 9 7 7 7-7"/>'),
  mic: P('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>'),
  play: P('<path d="M7 5v14l12-7z" fill="currentColor" stroke="none"/>'),
  pause: P('<rect x="6.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/>'),
  stopc: P('<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none"/>'),
};
export const icon = (name) => ICONS[name] || '';

export const VBADGE = `<span class="vbadge" title="موثّق ✦"><svg viewBox="0 0 24 24"><path d="M12 1.7l2 2.8 3.3-.9.2 3.4 3.2 1.2-1.7 3 2.2 2.6-3 1.6.7 3.4-3.4-.3-1.3 3.2L12 19.6l-2.3 2.5-1.3-3.2-3.4.3.7-3.4-3-1.6 2.2-2.6-1.7-3 3.2-1.2.2-3.4 3.3.9z" fill="#ff4d00" stroke="#191207" stroke-width="1.1"/><path d="m8.6 12.4 2.4 2.4 4.4-4.9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

/* ---------- أفاتار ---------- */
export function avatarEl(profile, size = 44, { link = true, presence = false } = {}) {
  const p = profile || {};
  const a = el('div', {
    class: `avatar av-${size}`,
    title: p.display_name || '',
    style: p.avatar_url ? {} : { background: hashColor(p.username || '?') },
  });
  if (p.avatar_url) a.append(el('img', { src: p.avatar_url, alt: p.display_name || '', loading: 'lazy' }));
  else a.textContent = (p.display_name || p.username || '؟').trim()[0] || '؟';
  if (link && p.username) {
    a.style.cursor = 'pointer';
    a.addEventListener('click', (e) => { e.stopPropagation(); location.hash = `#/u/${p.username}`; });
  }
  if (presence) {
    const wrap = el('span', { class: 'presence-wrap' }, a);
    if (store.online.has(p.id)) wrap.append(el('span', { class: 'presence-dot', title: 'أونلاين دلوقتي' }));
    return wrap;
  }
  return a;
}

export function nameHTML(p) {
  return `<span>${esc(p?.display_name || 'مستخدم')}</span>${p?.is_verified ? VBADGE : ''}`;
}

/* ---------- زرار المتابعة ---------- */
export function followButton(profile, { small = true } = {}) {
  if (!profile || profile.id === store.me?.id) return el('span');
  const btn = el('button', { class: 'btn ' + (small ? 'btn-sm ' : '') });
  const render = () => {
    const on = store.followingIds.has(profile.id);
    btn.className = 'btn ' + (small ? 'btn-sm ' : '') + (on ? '' : 'btn-or');
    btn.textContent = on ? 'بتتابعه ✓' : 'تابع ✦';
  };
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    const on = store.followingIds.has(profile.id);
    try {
      if (on) await api.unfollow(profile.id);
      else { await api.follow(profile.id); sfx.pop(); }
      render();
    } catch (err) { toastErr(arErr(err)); }
    delete btn.dataset.busy;
  });
  const off = store.on('follow', ({ id }) => {
    if (!btn.isConnected) { off?.(); return; }
    if (id === profile.id) render();
  });
  render();
  return btn;
}

/* ---------- صف مستخدم ---------- */
export function userRow(p, { withFollow = true, withBio = false, onClick } = {}) {
  const row = el('div', { class: 'user-row' },
    avatarEl(p, 44, { presence: true }),
    el('div', { class: 'u-info' },
      el('div', { class: 'u-name', html: nameHTML(p) }),
      withBio && p.bio
        ? el('div', { class: 'u-bio', text: p.bio })
        : el('div', { class: 'u-handle', text: '@' + (p.username || '') }),
    ),
    withFollow ? followButton(p) : null,
  );
  row.addEventListener('click', () => { onClick ? onClick(p) : (location.hash = `#/u/${p.username}`); });
  return row;
}

/* ---------- حالة فاضية وسكيلتون ---------- */
export function emptyState(emoji, title, sub = '') {
  return el('div', { class: 'empty-state' },
    el('div', { class: 'es-emoji', text: emoji }),
    el('div', { class: 'es-title', text: title }),
    sub ? el('div', { class: 'es-sub', text: sub }) : null,
  );
}

export function skeletonPost() {
  return el('div', { class: 'sticker post-card' },
    el('div', { class: 'hstack' },
      el('div', { class: 'skel', style: { width: '44px', height: '44px', borderRadius: '50%' } }),
      el('div', { class: 'grow vstack', style: { gap: '6px' } },
        el('div', { class: 'skel', style: { width: '38%', height: '14px' } }),
        el('div', { class: 'skel', style: { width: '22%', height: '11px' } }),
      ),
    ),
    el('div', { class: 'vstack', style: { marginTop: '14px', gap: '8px' } },
      el('div', { class: 'skel', style: { width: '95%', height: '13px' } }),
      el('div', { class: 'skel', style: { width: '70%', height: '13px' } }),
    ),
  );
}

export function spinnerRow() {
  return el('div', { class: 'center', style: { padding: '18px' } },
    el('span', { class: 'spin', style: { fontSize: '26px' }, text: '💿' }));
}

/* ---------- ميديا البوست ---------- */
function mediaGridEl(media) {
  const grid = el('div', { class: `post-media m${Math.min(media.length, 4)}` });
  const items = media.slice(0, 4);
  items.forEach((m, i) => {
    if (m.type === 'video') {
      const v = el('video', { src: m.url, controls: true, playsinline: true, preload: 'metadata', onclick: (e) => e.stopPropagation() });
      grid.append(v);
      autoPauseVideo(v);
    } else {
      grid.append(el('img', {
        src: m.url, alt: '', loading: 'lazy',
        onclick: (e) => { e.stopPropagation(); lightbox(items.filter((x) => x.type !== 'video').map((x) => ({ type: 'image', url: x.url })), items.filter((x) => x.type !== 'video').indexOf(m)); },
      }));
    }
  });
  return grid;
}

function autoPauseVideo(v) {
  const io = new IntersectionObserver((ents) => {
    ents.forEach((ent) => { if (!ent.isIntersecting && !v.paused) v.pause(); });
  }, { threshold: 0.1 });
  io.observe(v);
}

/* ---------- الاستطلاع ---------- */
function pollEl(p) {
  const box = el('div', { class: 'poll' });
  const render = () => {
    box.innerHTML = '';
    const poll = p.poll || {};
    const opts = poll.options || [];
    const counts = (poll.counts || []).map((n) => Number(n) || 0);
    const total = counts.reduce((a, b) => a + b, 0);
    const ended = poll.ends_at && new Date(poll.ends_at) < new Date();
    const voted = p._myVote != null;
    const showResults = voted || ended;
    opts.forEach((opt, i) => {
      const pct = total ? Math.round((counts[i] || 0) * 100 / total) : 0;
      const btn = el('button', { class: 'poll-opt' + (showResults ? ' done' : '') + (p._myVote === i ? ' mine' : '') },
        el('span', { class: 'fill' }),
        el('span', { text: (p._myVote === i ? '✦ ' : '') + opt }),
        showResults ? el('span', { class: 'pct', text: pct + '٪' }) : null,
      );
      if (showResults) requestAnimationFrame(() => { btn.querySelector('.fill').style.width = pct + '%'; });
      if (!showResults) btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const newPoll = await api.pollVote(p.id, i);
          p.poll = newPoll; p._myVote = i;
          sfx.pop();
          render();
        } catch (err) { toastErr(arErr(err)); }
      });
      else btn.addEventListener('click', (e) => e.stopPropagation());
      box.append(btn);
    });
    const meta = [];
    meta.push(`${nfmt(total)} صوت`);
    if (poll.ends_at) {
      meta.push(ended ? 'الاستطلاع خلص' : `لسه ${timeLeft(poll.ends_at)}`);
    }
    box.append(el('div', { class: 'poll-meta', text: meta.join(' · ') }));
  };
  render();
  return box;
}

function timeLeft(iso) {
  const s = (new Date(iso) - Date.now()) / 1000;
  if (s <= 0) return 'انتهى';
  if (s < 3600) return `${Math.ceil(s / 60)} دقيقة`;
  if (s < 86400) return `${Math.ceil(s / 3600)} ساعة`;
  return `${Math.ceil(s / 86400)} يوم`;
}

/* ---------- كارت الاقتباس المصغر ---------- */
function quoteCardEl(qp) {
  const media = qp.media || [];
  const card = el('div', { class: 'quote-card', onclick: (e) => { e.stopPropagation(); location.hash = `#/p/${qp.id}`; } },
    el('div', { class: 'q-head' },
      avatarEl(qp.author, 28, { link: false }),
      el('span', { class: 'bold small', html: nameHTML(qp.author) }),
      el('span', { class: 'muted small', text: '@' + (qp.author?.username || '') + ' · ' + timeAgo(qp.created_at) }),
    ),
    qp.content ? el('div', { class: 'q-content', html: linkify(qp.content) }) : null,
    media.length ? el('div', { class: 'q-media', text: media[0].type === 'video' ? '🎬 فيديو مرفق' : `🖼️ ${media.length} صورة` }) : null,
  );
  return card;
}

/* ---------- كارت البوست ---------- */
export function postCard(p, { detail = false, banner = null, onDeleted } = {}) {
  const me = store.me;
  const card = el('article', { class: 'sticker post-card' + (detail ? '' : ' clickable'), dataset: { pid: p.id } });

  if (banner) {
    card.append(el('div', { class: 'repost-banner', html: `${icon('repeat')}<span>${esc(banner)}</span>` }));
  }

  /* الهيدر */
  const moreBtn = el('button', { class: 'btn-ghost btn btn-icon post-more', html: icon('more'), 'aria-label': 'خيارات' });
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const items = [
      { label: 'انسخ الرابط', icon: icon('link'), action: async () => { await copy(postUrl(p.id)); toast('الرابط اتنسخ ✦', { emoji: '🔗' }); } },
    ];
    if (me && p.author_id === me.id) {
      items.push('---', {
        label: 'امسح البوست', icon: icon('trash'), danger: true,
        action: async () => {
          if (!(await confirmDlg('البوست هيتمسح خالص… متأكد؟'))) return;
          try {
            await api.deletePost(p.id);
            card.remove();
            toast('اتمسح البوست', { emoji: '🗑️' });
            onDeleted?.();
          } catch (err) { toastErr(arErr(err)); }
        },
      });
    }
    dropMenu(moreBtn, items);
  });

  const head = el('div', { class: 'post-head' },
    avatarEl(p.author, 44, { presence: true }),
    el('div', { class: 'post-meta' },
      el('div', { class: 'post-name-row' },
        el('span', { class: 'post-name', html: nameHTML(p.author), onclick: (e) => { e.stopPropagation(); location.hash = `#/u/${p.author.username}`; } }),
        el('span', { class: 'post-handle', text: '@' + (p.author?.username || '') }),
        el('span', { class: 'post-time', title: fullTime(p.created_at), text: '· ' + timeAgo(p.created_at), onclick: (e) => { e.stopPropagation(); location.hash = `#/p/${p.id}`; } }),
      ),
    ),
    moreBtn,
  );
  card.append(head);

  /* المحتوى */
  if (p.content) {
    const full = p.content;
    const isLong = !detail && full.length > 420;
    const contentEl = el('div', { class: 'post-content' + (detail ? ' big' : ''), html: linkify(isLong ? full.slice(0, 400) + '…' : full) });
    if (isLong) {
      const more = el('span', { class: 'read-more', text: ' اقرأ كمان ✦' });
      more.addEventListener('click', (e) => { e.stopPropagation(); contentEl.innerHTML = linkify(full); });
      contentEl.append(more);
    }
    card.append(contentEl);
  }

  const media = p.media || [];
  const visual = media.filter((m) => m.type !== 'audio');
  const audios = media.filter((m) => m.type === 'audio');
  if (visual.length) card.append(mediaGridEl(visual));
  audios.forEach((a) => card.append(audioPlayer(a.url)));
  if (p.poll) card.append(pollEl(p));
  if (p.quote) card.append(quoteCardEl(p.quote));
  else if (p.quote_of && !p.quote) card.append(el('div', { class: 'quote-card muted small', text: 'البوست المقتبس اتمسح 👻' }));

  /* أزرار التفاعل */
  const likeBtn = actBtn('heart', p.likes_count, 'c-like' + (p._liked ? ' on' : ''), 'لايك');
  likeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!me || likeBtn.dataset.busy) return;
    likeBtn.dataset.busy = '1';
    const on = likeBtn.classList.toggle('on');
    p._liked = on;
    p.likes_count += on ? 1 : -1;
    setCount(likeBtn, p.likes_count);
    if (on) { likeBtn.querySelector('svg').classList.add('heart-pop'); sfx.like(); }
    try { on ? await api.like(p.id) : await api.unlike(p.id); }
    catch (err) {
      p._liked = !on; p.likes_count += on ? -1 : 1;
      likeBtn.classList.toggle('on'); setCount(likeBtn, p.likes_count);
      if (!/duplicate key/.test(String(err?.message))) toastErr(arErr(err));
    }
    delete likeBtn.dataset.busy;
  });

  const cmtBtn = actBtn('comment', p.comments_count, '', 'تعليقات');
  cmtBtn.addEventListener('click', (e) => { e.stopPropagation(); location.hash = `#/p/${p.id}`; });

  const rtBtn = actBtn('repeat', p.reposts_count, 'c-rt' + (p._reposted ? ' on' : ''), 'ريبوست');
  rtBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!me) return;
    dropMenu(rtBtn, [
      {
        label: p._reposted ? 'إلغاء الريبوست' : 'ريبوست 🔁',
        icon: icon('repeat'),
        action: async () => {
          try {
            if (p._reposted) { await api.unrepost(p.id); p._reposted = false; p.reposts_count--; }
            else { await api.repost(p.id); p._reposted = true; p.reposts_count++; sfx.pop(); toast('عملت ريبوست ✦', { emoji: '🔁', color: 'var(--gr)' }); }
            rtBtn.classList.toggle('on', p._reposted);
            setCount(rtBtn, p.reposts_count);
          } catch (err) { toastErr(arErr(err)); }
        },
      },
      {
        label: 'اقتباس ✍️',
        icon: icon('pencil'),
        action: async () => { (await import('./compose.js')).openComposer({ quote: p }); },
      },
    ]);
  });

  const viewsEl = el('span', { class: 'act-btn views', html: icon('eye') + `<span>${nfmt(p.views_count)}</span>`, title: 'مشاهدات' });

  const bmBtn = actBtn('bookmark', null, 'c-bm' + (p._bookmarked ? ' on' : ''), 'حفظ');
  bmBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!me || bmBtn.dataset.busy) return;
    bmBtn.dataset.busy = '1';
    const on = bmBtn.classList.toggle('on');
    p._bookmarked = on;
    try {
      on ? await api.bookmark(p.id) : await api.unbookmark(p.id);
      if (on) { sfx.pop(); toast('اتحفظ في المحفوظات', { emoji: '🔖', color: 'var(--bl)' }); }
    } catch (err) {
      bmBtn.classList.toggle('on');
      if (!/duplicate key/.test(String(err?.message))) toastErr(arErr(err));
    }
    delete bmBtn.dataset.busy;
  });

  const shareBtn = actBtn('share', null, '', 'مشاركة');
  shareBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const url = postUrl(p.id);
    if (navigator.share) {
      navigator.share({ title: 'روش', text: (p.content || '').slice(0, 80), url }).catch(() => {});
    } else {
      await copy(url);
      toast('الرابط اتنسخ ✦', { emoji: '🔗' });
    }
  });

  card.append(el('div', { class: 'post-actions' }, cmtBtn, rtBtn, likeBtn, bmBtn, shareBtn, viewsEl));

  if (!detail) {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a,button,video,img,.poll,.quote-card')) return;
      location.hash = `#/p/${p.id}`;
    });
  }
  return card;
}

function actBtn(ico, count, cls = '', title = '') {
  return el('button', {
    class: 'act-btn ' + cls, title,
    html: icon(ico) + (count != null ? `<span>${nfmt(count)}</span>` : ''),
  });
}
function setCount(btn, n) {
  const s = btn.querySelector('span');
  if (s) s.textContent = nfmt(Math.max(0, n));
}
export function postUrl(id) {
  return location.origin + location.pathname + '#/p/' + id;
}

/* ---------- مراقب المشاهدات ---------- */
export function observeViews(container) {
  const seen = new WeakSet();
  const io = new IntersectionObserver((ents) => {
    for (const ent of ents) {
      if (ent.isIntersecting && !seen.has(ent.target)) {
        seen.add(ent.target);
        api.queueView(ent.target.dataset.pid);
      }
    }
  }, { threshold: 0.45 });
  const mo = new MutationObserver(() => {
    container.querySelectorAll('.post-card[data-pid]').forEach((c) => io.observe(c));
  });
  mo.observe(container, { childList: true, subtree: true });
  container.querySelectorAll('.post-card[data-pid]').forEach((c) => io.observe(c));
  return () => { io.disconnect(); mo.disconnect(); };
}

/* ---------- سحب لانهائي ---------- */
export function infiniteScroll(sentinel, loadMore) {
  let busy = false, done = false;
  const io = new IntersectionObserver(async (ents) => {
    if (!ents[0].isIntersecting || busy || done) return;
    busy = true;
    try { done = (await loadMore()) === false; } catch (e) { console.error(e); }
    busy = false;
  }, { rootMargin: '700px' });
  io.observe(sentinel);
  return { stop: () => io.disconnect(), setDone: (v) => { done = v; } };
}

/* ============================================================
   المنشن @ — إكمال تلقائي على أي textarea/input
   ============================================================ */
export function attachMention(input) {
  let box = null, items = [], active = 0, token = null;

  const close = () => { box?.remove(); box = null; token = null; items = []; };

  const findToken = () => {
    const pos = input.selectionStart;
    if (pos == null) return null;
    const before = input.value.slice(0, pos);
    const m = before.match(/(?:^|[\s\n])@([A-Za-z0-9_]{0,20})$/);
    if (!m) return null;
    return { start: pos - m[1].length - 1, query: m[1] };
  };

  const doSearch = debounce(async () => {
    if (!token) return;
    try {
      const users = token.query
        ? await api.searchUsers(token.query)
        : await api.whoToFollow(6);
      items = (users || []).filter((u) => u.id !== store.me?.id).slice(0, 6);
      active = 0;
      renderBox();
    } catch { close(); }
  }, 180);

  const renderBox = () => {
    if (!items.length) { close(); return; }
    if (!box) { box = el('div', { class: 'mention-box' }); document.body.append(box); }
    box.innerHTML = '';
    items.forEach((u, i) => {
      const row = el('div', { class: 'mention-item' + (i === active ? ' active' : '') },
        avatarEl(u, 30, { link: false }),
        el('div', { class: 'grow', style: { minWidth: 0 } },
          el('div', { class: 'm-name', html: nameHTML(u) }),
          el('div', { class: 'm-handle', text: '@' + u.username }),
        ),
      );
      row.addEventListener('mousedown', (e) => { e.preventDefault(); pick(u); });
      box.append(row);
    });
    position();
  };

  const position = () => {
    const r = input.getBoundingClientRect();
    const w = Math.min(Math.max(r.width, 220), 320);
    box.style.width = w + 'px';
    box.style.insetInlineStart = r.left + 'px';
    const h = box.offsetHeight || 220;
    if (r.top - h - 8 > 8) { box.style.top = (r.top - h - 8) + 'px'; }  // فوق الحقل
    else { box.style.top = (r.bottom + 8) + 'px'; }
  };

  const pick = (u) => {
    if (!token) return;
    const pos = input.selectionStart;
    const before = input.value.slice(0, token.start);
    const after = input.value.slice(pos);
    const insert = '@' + u.username + ' ';
    input.value = before + insert + after;
    const np = before.length + insert.length;
    input.setSelectionRange(np, np);
    close();
    input.dispatchEvent(new Event('input'));
    input.focus();
  };

  const onInput = () => {
    token = findToken();
    if (token) doSearch();
    else close();
  };
  const onKey = (e) => {
    if (!box || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); active = (active + 1) % items.length; renderBox(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); active = (active - 1 + items.length) % items.length; renderBox(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); pick(items[active]); }
    else if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
  };
  const onBlur = () => setTimeout(close, 180);

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKey);   // بيتضاف قبل هاندلر الإرسال فبياخد الأولوية
  input.addEventListener('blur', onBlur);
  return { close, destroy() { input.removeEventListener('input', onInput); input.removeEventListener('keydown', onKey); input.removeEventListener('blur', onBlur); close(); } };
}

/* ============================================================
   مشغّل الصوت — بستايل روش (موجة + play + وقت)
   ============================================================ */
export function audioPlayer(url, { mine = false } = {}) {
  const BARS = 26;
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.src = url;

  const seed = [...url].reduce((a, c) => a + c.charCodeAt(0), 7);
  const wave = el('div', { class: 'ap-wave' });
  for (let i = 0; i < BARS; i++) {
    const h = 22 + ((seed * (i + 3) * 9301 + 49297) % 233) / 233 * 74;
    wave.append(el('i', { style: { height: h.toFixed(0) + '%' } }));
  }

  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const playBtn = el('button', { class: 'ap-btn', html: icon('play'), 'aria-label': 'تشغيل' });
  const timeEl = el('span', { class: 'ap-time', text: '0:00' });

  audio.addEventListener('loadedmetadata', () => { if (isFinite(audio.duration)) timeEl.textContent = fmt(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    const frac = audio.duration ? audio.currentTime / audio.duration : 0;
    const lit = Math.round(frac * BARS);
    [...wave.children].forEach((b, i) => b.classList.toggle('on', i < lit));
    timeEl.textContent = fmt((audio.duration || 0) - audio.currentTime);
  });
  const reset = () => { playBtn.innerHTML = icon('play'); [...wave.children].forEach((b) => b.classList.remove('on')); timeEl.textContent = fmt(audio.duration); };
  audio.addEventListener('ended', reset);
  audio.addEventListener('pause', () => { playBtn.innerHTML = icon('play'); });
  audio.addEventListener('play', () => { playBtn.innerHTML = icon('pause'); });

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audio.paused) {
      document.querySelectorAll('audio').forEach((a) => { if (a !== audio) a.pause(); });
      audio.play().catch(() => {});
    } else audio.pause();
  });
  wave.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!audio.duration) return;
    const r = wave.getBoundingClientRect();
    audio.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * audio.duration;
  });

  return el('div', { class: 'audio-player' + (mine ? ' mine' : '') }, playBtn, wave, timeEl);
}

/* ============================================================
   مسجّل الصوت — مودال تسجيل (يرجّع Blob أو null)
   ============================================================ */
export function recordAudio({ maxSec = 120 } = {}) {
  return new Promise((resolve) => {
    let rec = null, chunks = [], stream = null, timer = null, seconds = 0, blob = null, previewUrl = null, settled = false;

    const cleanup = () => {
      clearInterval(timer);
      try { if (rec && rec.state !== 'inactive') rec.stop(); } catch {}
      stream?.getTracks().forEach((t) => t.stop());
    };
    const finish = (val) => { if (settled) return; settled = true; cleanup(); if (previewUrl && !val) URL.revokeObjectURL(previewUrl); m.close(); resolve(val ? { blob, seconds } : null); };

    const dot = el('span', { class: 'rec-dot' });
    const timeEl = el('span', { class: 'rec-time', text: '0:00' });
    const hint = el('div', { class: 'rec-hint muted', text: 'دوس الزرار عشان تبدأ التسجيل' });
    const previewSlot = el('div', { class: 'rec-preview' });
    const bigBtn = el('button', { class: 'btn btn-lg btn-danger rec-main', html: icon('mic') + '<span>سجّل</span>' });
    const foot = el('div', { class: 'rec-foot hidden' });

    const fmt = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

    const startRec = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch { toastErr('مش قادرين نوصل للمايك — اسمح للموقع يستخدمه'); finish(null); return; }
      chunks = [];
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        blob = new Blob(chunks, { type: (chunks[0]?.type) || rec.mimeType || 'audio/webm' });
        previewUrl = URL.createObjectURL(blob);
        showPreview();
      };
      rec.start(250);   // timeslice يضمن إطلاق dataavailable دوريًا
      seconds = 0;
      dot.classList.add('live');
      hint.textContent = 'بتسجّل دلوقتي… دوس إيقاف لما تخلص';
      bigBtn.className = 'btn btn-lg btn-dark rec-main';
      bigBtn.innerHTML = icon('stopc') + '<span>إيقاف</span>';
      timer = setInterval(() => {
        seconds++;
        timeEl.textContent = fmt(seconds);
        if (seconds >= maxSec) stopRec();
      }, 1000);
    };

    const stopRec = () => {
      clearInterval(timer);
      dot.classList.remove('live');
      try { rec?.stop(); } catch {}
      stream?.getTracks().forEach((t) => t.stop());
    };

    const showPreview = () => {
      hint.textContent = `تسجيل جاهز (${fmt(seconds)}) — تبعته؟`;
      bigBtn.classList.add('hidden');
      previewSlot.innerHTML = '';
      previewSlot.append(audioPlayer(previewUrl));
      previewSlot.classList.remove('hidden');
      foot.classList.remove('hidden');
    };

    bigBtn.addEventListener('click', () => { if (rec && rec.state === 'recording') stopRec(); else startRec(); });

    foot.append(
      el('button', { class: 'btn', html: icon('mic') + '<span>سجّل تاني</span>', onclick: () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        blob = null; previewUrl = null;
        previewSlot.classList.add('hidden'); previewSlot.innerHTML = '';
        foot.classList.add('hidden');
        bigBtn.classList.remove('hidden');
        timeEl.textContent = '0:00';
        hint.textContent = 'دوس الزرار عشان تبدأ التسجيل';
      } }),
      el('button', { class: 'btn btn-or', html: icon('check') + '<span>استخدم التسجيل</span>', onclick: () => finish(blob) }),
    );

    const body = el('div', { class: 'rec-body' },
      el('div', { class: 'rec-status' }, dot, timeEl),
      hint,
      previewSlot,
      bigBtn,
      foot,
    );
    previewSlot.classList.add('hidden');

    const m = modal({ title: 'تسجيل صوتي 🎙️', content: body, onClose: () => finish(null) });
  });
}
