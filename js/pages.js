// روش — الصفحات: فيد، بوست وتعليقات، بروفايل، إكسبلور، إشعارات، محفوظات
import { el, esc, linkify, timeAgo, nfmt, modal, toast, toastErr, sfx, autoResize, debounce, dropMenu, confirmDlg } from './lib.js';
import { store, api, arErr, cachedProfile } from './sb.js';
import { avatarEl, nameHTML, followButton, userRow, emptyState, skeletonPost, spinnerRow, postCard, icon, observeViews, infiniteScroll } from './components.js';
import { renderStoriesBar } from './stories.js';
import { openComposer } from './compose.js';
import { CONFIG } from './config.js';

/* ============================================================
   الفيد الرئيسي
   ============================================================ */
export function feedPage(root) {
  const cleanups = [];
  let tab = sessionStorage.getItem('rawsh_feed_tab') || 'foryou';

  /* ستوريز */
  const storiesMount = el('div');
  renderStoriesBar(storiesMount);
  root.append(storiesMount);

  /* كومبوزر مصغر */
  root.append(el('div', { class: 'sticker mini-composer' },
    avatarEl(store.me, 44, { link: false }),
    el('button', { class: 'fake-input', text: 'قول حاجة روش… ✦', onclick: () => openComposer({}) }),
    el('button', { class: 'btn btn-icon btn-yl', html: icon('image'), title: 'صورة', onclick: () => openComposer({}) }),
  ));

  /* تابات */
  const tabsEl = el('div', { class: 'tabs' },
    el('button', { text: 'ليك ✨', dataset: { t: 'foryou' } }),
    el('button', { text: 'بتتابعهم 👥', dataset: { t: 'following' } }),
  );
  root.append(tabsEl);

  /* بيل البوستات الجديدة */
  const pillWrap = el('div', { class: 'new-pill' });
  root.append(pillWrap);
  let newCount = 0;
  cleanups.push(store.on('newPost', () => {
    newCount++;
    pillWrap.innerHTML = '';
    const b = el('button', { class: 'btn btn-pk btn-sm', text: `✦ ${newCount} بوست جديد — شوفهم` });
    b.addEventListener('click', () => { newCount = 0; pillWrap.innerHTML = ''; reload(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    pillWrap.append(b);
  }));

  /* القايمة */
  const list = el('div');
  const sentinel = el('div');
  root.append(list, sentinel);
  cleanups.push(observeViews(list));

  const st = { offset: 0, before: null, rBefore: null, shown: new Set(), loading: false };

  async function loadMore() {
    if (st.loading) return true;
    st.loading = true;
    const spin = spinnerRow();
    list.append(spin);
    let more = true;
    try {
      if (tab === 'foryou') {
        const rows = await api.feedForYou(st.offset);
        st.offset += rows.length;
        renderItems(rows.map((p) => ({ post: p })));
        more = rows.length >= CONFIG.pageSize;
      } else {
        const fids = [...store.followingIds, store.me.id];
        const [posts, reposts] = await Promise.all([
          api.feedFollowing(st.before),
          api.repostsBy(fids, st.rBefore),
        ]);
        if (posts.length) st.before = posts[posts.length - 1].created_at;
        if (reposts.length) st.rBefore = reposts[reposts.length - 1].reposted_at;
        const items = [
          ...posts.map((p) => ({ t: +new Date(p.created_at), post: p })),
          ...reposts.map((r) => ({ t: +new Date(r.reposted_at), post: r.post, reposter: r.reposter })),
        ].sort((a, b) => b.t - a.t);
        renderItems(items);
        more = posts.length >= CONFIG.pageSize || reposts.length >= CONFIG.pageSize;
      }
    } catch (err) { console.error(err); toastErr(arErr(err)); }
    spin.remove();
    if (!more && !list.children.length) {
      list.append(tab === 'following'
        ? emptyState('👀', 'مفيش حاجة من أصحابك لسه', 'تابع ناس من صفحة الاستكشاف عشان الفيد يولّع')
        : emptyState('💿', 'لسه مفيش بوستات', 'كن أول واحد يروّش الدنيا — اكتب أول بوست!'));
    }
    st.loading = false;
    return more;
  }

  function renderItems(items) {
    for (const it of items) {
      const key = it.reposter ? `r:${it.post.id}:${it.reposter?.id}` : `p:${it.post.id}`;
      if (st.shown.has(key) || st.shown.has(`p:${it.post.id}`)) continue;
      st.shown.add(key);
      list.append(postCard(it.post, {
        banner: it.reposter ? `${it.reposter.display_name} عمل ريبوست` : null,
      }));
    }
  }

  const inf = infiniteScroll(sentinel, loadMore);
  cleanups.push(inf.stop);

  function reload() {
    st.offset = 0; st.before = null; st.rBefore = null; st.shown.clear();
    list.innerHTML = '';
    const skels = [skeletonPost(), skeletonPost()];
    list.append(...skels);
    inf.setDone(false);
    loadMore().then(() => skels.forEach((s) => s.remove()));
  }

  function setTab(t) {
    tab = t;
    sessionStorage.setItem('rawsh_feed_tab', t);
    tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.t === t));
    reload();
  }
  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-t]');
    if (b && b.dataset.t !== tab) { sfx.pop(); setTab(b.dataset.t); }
  });
  tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.t === tab));

  /* أول تحميل + بوستاتي الجديدة تظهر فورًا */
  cleanups.push(store.on('composed', (p) => {
    if (st.shown.has(`p:${p.id}`)) return;
    st.shown.add(`p:${p.id}`);
    list.prepend(postCard(p));
    renderStoriesBar(storiesMount);
  }));

  reload();
  return () => cleanups.forEach((f) => f?.());
}

/* ============================================================
   صفحة البوست + التعليقات
   ============================================================ */
export function postDetailPage(root, { id }) {
  const cleanups = [];
  root.append(pageTitle('البوست 💬'));
  const holder = el('div');
  root.append(holder);
  holder.append(skeletonPost());

  (async () => {
    let p;
    try { p = await api.getPost(id); } catch (err) { console.error(err); }
    holder.innerHTML = '';
    if (!p) { holder.append(emptyState('👻', 'البوست ده مش موجود', 'يمكن اتمسح… بعد العيد معلش')); return; }
    api.queueView(p.id);
    holder.append(postCard(p, { detail: true, onDeleted: () => { location.hash = '#/'; } }));

    /* كومبوزر التعليق */
    const ta = el('textarea', { class: 'textarea grow', placeholder: 'اكتب تعليق روش…', maxlength: 500 });
    const sendBtn = el('button', { class: 'btn btn-or btn-sm', text: 'علّق ✦' });
    const composer = el('div', { class: 'sticker comment-composer' },
      avatarEl(store.me, 36, { link: false }), ta, sendBtn);
    holder.append(composer);
    autoResize(ta);

    const cmtList = el('div', { class: 'sticker', style: { padding: '6px 16px 14px' } });
    holder.append(cmtList);
    cmtList.append(spinnerRow());

    let comments = [];
    try { comments = await api.comments(p.id); } catch (err) { console.error(err); }
    cmtList.innerHTML = '';

    const roots = comments.filter((c) => !c.parent_id);
    const repliesOf = (pid) => comments.filter((c) => c.parent_id === pid);

    if (!roots.length) cmtList.append(emptyState('🦗', 'مفيش تعليقات لسه', 'كن أول واحد يقول رأيه'));

    const addCommentEl = (c, { isReply = false, container = cmtList, prepend = false } = {}) => {
      const item = commentItem(c, {
        isReply,
        onReply: (parent) => {
          replyBox(parent, item);
        },
        onDeleted: () => {
          p.comments_count = Math.max(0, p.comments_count - 1);
        },
      });
      prepend ? container.prepend(item) : container.append(item);
      return item;
    };

    const replyBox = (parent, afterEl) => {
      if (afterEl.nextElementSibling?.classList.contains('inline-reply')) {
        afterEl.nextElementSibling.querySelector('textarea')?.focus();
        return;
      }
      const rta = el('textarea', { class: 'textarea grow', placeholder: `رد على @${parent.author.username}…`, maxlength: 500 });
      const rbtn = el('button', { class: 'btn btn-pk btn-sm', text: 'رد ↩️' });
      const box = el('div', { class: 'comment-composer inline-reply', style: { padding: '4px 0 10px 0', marginInlineStart: '44px' } },
        avatarEl(store.me, 28, { link: false }), rta, rbtn);
      afterEl.after(box);
      autoResize(rta);
      rta.focus();
      rbtn.addEventListener('click', async () => {
        const txt = rta.value.trim();
        if (!txt || rbtn.disabled) return;
        rbtn.disabled = true;
        try {
          const c = await api.addComment(p.id, txt, parent.id);
          box.remove();
          addCommentElAfter(c, afterEl);
          sfx.pop();
          p.comments_count++;
        } catch (err) { toastErr(arErr(err)); rbtn.disabled = false; }
      });
    };

    const addCommentElAfter = (c, afterEl) => {
      const item = commentItem(c, { isReply: true, onReply: null });
      afterEl.after(item);
    };

    for (const c of roots) {
      const item = addCommentEl(c);
      const reps = repliesOf(c.id);
      if (reps.length) {
        const btn = el('button', { class: 'show-replies', text: `↩️ عرض الردود (${reps.length})` });
        btn.addEventListener('click', () => {
          btn.remove();
          let anchor = item;
          for (const r of reps) {
            const re = commentItem(r, { isReply: true, onReply: null });
            anchor.after(re);
            anchor = re;
          }
        });
        item.after(btn);
      }
    }

    sendBtn.addEventListener('click', async () => {
      const txt = ta.value.trim();
      if (!txt || sendBtn.disabled) return;
      sendBtn.disabled = true;
      try {
        const c = await api.addComment(p.id, txt);
        ta.value = ''; ta.style.height = 'auto';
        cmtList.querySelector('.empty-state')?.remove();
        addCommentEl(c, { prepend: true });
        sfx.pop();
        p.comments_count++;
      } catch (err) { toastErr(arErr(err)); }
      sendBtn.disabled = false;
    });
    ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendBtn.click(); });
  })();

  return () => cleanups.forEach((f) => f?.());
}

function commentItem(c, { isReply = false, onReply, onDeleted } = {}) {
  const likeBtn = el('button', { class: c._liked ? 'on' : '', html: icon('heart') + `<span>${nfmt(c.likes_count || 0)}</span>` });
  likeBtn.addEventListener('click', async () => {
    if (likeBtn.dataset.busy) return;
    likeBtn.dataset.busy = '1';
    const on = likeBtn.classList.toggle('on');
    c.likes_count = (c.likes_count || 0) + (on ? 1 : -1);
    likeBtn.querySelector('span').textContent = nfmt(Math.max(0, c.likes_count));
    if (on) sfx.like();
    try { on ? await api.likeComment(c.id) : await api.unlikeComment(c.id); }
    catch (err) { likeBtn.classList.toggle('on'); }
    delete likeBtn.dataset.busy;
  });

  const foot = el('div', { class: 'comment-foot' },
    el('span', { text: timeAgo(c.created_at) }),
    likeBtn,
    (!isReply && onReply) ? el('button', { text: '↩️ رد', onclick: () => onReply(c) }) : null,
  );

  if (store.me && c.author_id === store.me.id) {
    foot.append(el('button', {
      text: '🗑️', title: 'امسح',
      onclick: async () => {
        if (!(await confirmDlg('تمسح التعليق؟'))) return;
        try { await api.deleteComment(c.id); item.remove(); onDeleted?.(); } catch (err) { toastErr(arErr(err)); }
      },
    }));
  }

  const item = el('div', { class: 'comment-item' + (isReply ? ' reply-item' : '') },
    avatarEl(c.author, isReply ? 28 : 36),
    el('div', { class: 'comment-bubble' },
      el('div', { class: 'comment-head' },
        el('span', { class: 'comment-name', html: nameHTML(c.author), onclick: () => { location.hash = `#/u/${c.author.username}`; } }),
        el('span', { class: 'muted small', text: '@' + (c.author?.username || '') }),
      ),
      el('div', { class: 'comment-text', html: linkify(c.content) }),
      foot,
    ),
  );
  return item;
}

/* ============================================================
   البروفايل
   ============================================================ */
export function profilePage(root, { username }) {
  const cleanups = [];
  (async () => {
    let p;
    try { p = await api.profileByUsername(username); } catch (err) { console.error(err); }
    if (!p) { root.append(emptyState('🧐', 'مفيش حد بالاسم ده', '@' + esc(username))); return; }
    const isMe = store.me?.id === p.id;

    /* الهيدر */
    const cover = el('div', { class: 'profile-cover' + (p.cover_url ? '' : ' default-cover') });
    if (p.cover_url) cover.style.backgroundImage = `url("${p.cover_url}")`;

    const actions = el('div', { class: 'profile-actions' });
    if (isMe) {
      actions.append(el('button', {
        class: 'btn btn-sm', text: 'عدّل بروفايلك ✏️',
        onclick: async () => (await import('./settings.js')).openEditProfile(() => renderHead()),
      }));
    } else {
      const msgBtn = el('button', { class: 'btn btn-sm btn-bl', html: icon('send') + '<span>رسالة</span>' });
      msgBtn.addEventListener('click', async () => {
        try {
          const conv = await api.openConversation(p.id);
          location.hash = `#/messages/${conv.id}`;
        } catch (err) { toastErr(arErr(err)); }
      });
      actions.append(msgBtn, followButton(p, { small: true }));
    }

    const statsBtn = (label, count, loader) => {
      const b = el('button', {}, el('b', { text: nfmt(count) }), el('span', { text: label }));
      b.addEventListener('click', async () => {
        const box = el('div', { class: 'followers-list vstack' }, spinnerRow());
        modal({ title: label, content: box });
        try {
          const users = await loader();
          box.innerHTML = '';
          if (!users.length) box.append(emptyState('🦗', 'مفيش حد هنا لسه'));
          users.forEach((u) => box.append(userRow(u)));
        } catch (err) { box.innerHTML = ''; box.append(emptyState('💥', 'مشكلة في التحميل')); }
      });
      return b;
    };

    const headCard = el('div', { class: 'sticker profile-head' });
    const renderHead = () => {
      const fresh = cachedProfile(p.id) || p;
      Object.assign(p, fresh);
      headCard.innerHTML = '';
      const cover2 = el('div', { class: 'profile-cover' + (p.cover_url ? '' : ' default-cover') });
      if (p.cover_url) cover2.style.backgroundImage = `url("${p.cover_url}")`;
      const joined = new Date(p.created_at);
      const AR_M = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
      headCard.append(
        cover2,
        el('div', { class: 'profile-top' },
          actions,
          el('div', { class: 'profile-avatar-wrap' }, avatarEl(p, 96, { link: false })),
          el('div', { class: 'profile-name', html: nameHTML(p) }),
          el('div', { class: 'profile-handle', text: '@' + p.username }),
          p.bio ? el('div', { class: 'profile-bio', html: linkify(p.bio) }) : null,
          el('div', { class: 'profile-meta' },
            el('span', { text: `📅 انضم ${AR_M[joined.getMonth()]} ${joined.getFullYear()}` }),
            p.streak >= 2 ? el('span', { class: 'streak-chip', text: `🔥 ${p.streak} يوم ورا بعض` }) : null,
            store.online.has(p.id) ? el('span', { style: { color: 'var(--gr)', fontWeight: '700' }, text: '🟢 أونلاين دلوقتي' }) : null,
          ),
          el('div', { class: 'profile-stats' },
            statsBtn('متابِع', p.followers_count, () => api.followersOf(p.id)),
            statsBtn('بيتابع', p.following_count, () => api.followingOf(p.id)),
            el('button', {}, el('b', { text: nfmt(p.posts_count) }), el('span', { text: 'بوست' })),
          ),
        ),
      );
    };
    renderHead();
    root.append(headCard);

    /* التابات */
    const tabs = [
      { id: 'posts', label: 'بوستات 📝' },
      { id: 'media', label: 'ميديا 🖼️' },
      { id: 'likes', label: 'لايكات ❤️' },
    ];
    if (isMe) tabs.push({ id: 'bookmarks', label: 'محفوظات 🔖' });

    const tabsEl = el('div', { class: 'tabs' });
    tabs.forEach((t) => tabsEl.append(el('button', { text: t.label, dataset: { t: t.id } })));
    root.append(tabsEl);

    const list = el('div');
    const sentinel = el('div');
    root.append(list, sentinel);
    cleanups.push(observeViews(list));

    let tab = 'posts';
    const st = { before: null, rBefore: null, cursor: null, shown: new Set(), loading: false };

    async function loadMore() {
      if (st.loading) return true;
      st.loading = true;
      const spin = spinnerRow();
      list.append(spin);
      let more = false;
      try {
        if (tab === 'posts') {
          const [posts, reposts] = await Promise.all([
            api.postsByAuthor(p.id, st.before),
            api.repostsBy([p.id], st.rBefore),
          ]);
          if (posts.length) st.before = posts[posts.length - 1].created_at;
          if (reposts.length) st.rBefore = reposts[reposts.length - 1].reposted_at;
          const items = [
            ...posts.map((x) => ({ t: +new Date(x.created_at), post: x })),
            ...reposts.map((r) => ({ t: +new Date(r.reposted_at), post: r.post, reposter: r.reposter })),
          ].sort((a, b) => b.t - a.t);
          for (const it of items) {
            const key = it.reposter ? `r:${it.post.id}` : `p:${it.post.id}`;
            if (st.shown.has(key)) continue;
            st.shown.add(key);
            list.append(postCard(it.post, { banner: it.reposter ? `${it.reposter.display_name} عمل ريبوست` : null }));
          }
          more = posts.length >= CONFIG.pageSize || reposts.length >= CONFIG.pageSize;
        } else if (tab === 'media') {
          const posts = await api.postsByAuthor(p.id, st.before, { mediaOnly: true });
          if (posts.length) st.before = posts[posts.length - 1].created_at;
          let grid = list.querySelector('.media-grid');
          if (!grid) { grid = el('div', { class: 'media-grid' }); list.append(grid); }
          for (const post of posts) {
            for (const m of (post.media || []).slice(0, 4)) {
              const item = el('div', { class: 'mg-item', onclick: () => { location.hash = `#/p/${post.id}`; } });
              item.append(m.type === 'video'
                ? el('video', { src: m.url, muted: true, preload: 'metadata' })
                : el('img', { src: m.url, loading: 'lazy', alt: '' }));
              if (m.type === 'video') item.append(el('span', { class: 'mg-vid', text: '🎬' }));
              grid.append(item);
            }
          }
          more = posts.length >= CONFIG.pageSize;
        } else if (tab === 'likes' || tab === 'bookmarks') {
          const res = tab === 'likes' ? await api.likedPosts(p.id, st.cursor) : await api.bookmarkedPosts(st.cursor);
          st.cursor = res.cursor;
          for (const post of res.items) {
            if (st.shown.has(post.id)) continue;
            st.shown.add(post.id);
            list.append(postCard(post));
          }
          more = !!res.cursor;
        }
      } catch (err) { console.error(err); }
      spin.remove();
      if (!list.querySelector('.post-card') && !list.querySelector('.mg-item')) {
        const msgs = {
          posts: ['📭', 'مفيش بوستات لسه'],
          media: ['🖼️', 'مفيش صور ولا فيديوهات'],
          likes: ['💔', 'مفيش لايكات لسه'],
          bookmarks: ['🔖', 'مفيش محفوظات لسه'],
        };
        list.append(emptyState(msgs[tab][0], msgs[tab][1]));
      }
      st.loading = false;
      return more;
    }

    const inf = infiniteScroll(sentinel, loadMore);
    cleanups.push(inf.stop);

    function setTab(t) {
      tab = t;
      st.before = null; st.rBefore = null; st.cursor = null; st.shown.clear();
      list.innerHTML = '';
      inf.setDone(false);
      tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.t === t));
      loadMore();
    }
    tabsEl.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-t]');
      if (b && b.dataset.t !== tab) { sfx.pop(); setTab(b.dataset.t); }
    });
    setTab('posts');
  })();

  return () => cleanups.forEach((f) => f?.());
}

/* ============================================================
   الإكسبلور
   ============================================================ */
export function explorePage(root) {
  const cleanups = [];
  root.append(pageTitle('استكشف 🧭'));

  const input = el('input', { class: 'input', placeholder: '🔍 دوّر على ناس، بوستات، هاشتاجات…', style: { marginBottom: '16px', borderRadius: '999px', padding: '13px 18px' } });
  root.append(input);

  const results = el('div');
  const home = el('div');
  root.append(results, home);

  /* الرئيسية: تريند + اقتراحات */
  (async () => {
    try {
      const [tags, users, posts] = await Promise.all([
        api.trendingTags(8).catch(() => []),
        api.whoToFollow(6).catch(() => []),
        api.feedForYou(0, 10).catch(() => []),
      ]);
      if (tags.length) {
        home.append(sectionTitle('🔥 التريند دلوقتي'));
        const grid = el('div', { class: 'trend-grid' });
        tags.forEach((t, i) => grid.append(el('a', {
          class: 'sticker trend-card', href: `#/tag/${encodeURIComponent(t.tag)}`,
        },
          el('div', { class: 'muted small', text: `#${i + 1} تريند مصر 🇪🇬` }),
          el('div', { class: 't-tag', text: '#' + t.tag }),
          el('div', { class: 't-count', text: `${nfmt(t.uses)} بوست` }),
        )));
        home.append(grid);
      }
      if (users.length) {
        home.append(sectionTitle('✦ ناس تحبك تتابعهم'));
        const box = el('div', { class: 'sticker', style: { padding: '8px' } });
        users.forEach((u) => box.append(userRow(u, { withBio: true })));
        home.append(box, el('div', { style: { height: '18px' } }));
      }
      if (posts.length) {
        home.append(sectionTitle('👀 بوستات ممكن تعجبك'));
        const lst = el('div');
        posts.forEach((p) => lst.append(postCard(p)));
        home.append(lst);
        cleanups.push(observeViews(lst));
      }
      if (!tags.length && !users.length && !posts.length) {
        home.append(emptyState('🛸', 'المنصة لسه جديدة', 'ابدأ انشر وهات صحابك!'));
      }
    } catch (err) { console.error(err); }
  })();

  /* البحث */
  const doSearch = debounce(async () => {
    const qs = input.value.trim();
    if (qs.length < 2) { results.innerHTML = ''; home.classList.remove('hidden'); return; }
    home.classList.add('hidden');
    results.innerHTML = '';
    results.append(spinnerRow());
    try {
      const [users, tags, posts] = await Promise.all([
        api.searchUsers(qs).catch(() => []),
        api.searchTags(qs.replace(/^#/, '')).catch(() => []),
        api.searchPosts(qs).catch(() => []),
      ]);
      results.innerHTML = '';
      if (!users.length && !tags.length && !posts.length) {
        results.append(emptyState('🔍', 'ملقناش حاجة', `مفيش نتايج عن «${esc(qs)}»`));
        return;
      }
      if (users.length) {
        results.append(sectionTitle('👤 ناس'));
        const box = el('div', { class: 'sticker', style: { padding: '8px', marginBottom: '16px' } });
        users.slice(0, 6).forEach((u) => box.append(userRow(u, { withBio: true })));
        results.append(box);
      }
      if (tags.length) {
        results.append(sectionTitle('#️⃣ هاشتاجات'));
        const chips = el('div', { class: 'widget-body chips', style: { padding: '0 0 16px' } });
        tags.forEach((t) => chips.append(el('a', { class: 'chip yl', href: `#/tag/${encodeURIComponent(t.tag)}`, html: `#${esc(t.tag)} <small>${nfmt(t.uses)}</small>` })));
        results.append(chips);
      }
      if (posts.length) {
        results.append(sectionTitle('📝 بوستات'));
        const lst = el('div');
        posts.forEach((p) => lst.append(postCard(p)));
        results.append(lst);
      }
    } catch (err) { results.innerHTML = ''; toastErr(arErr(err)); }
  }, 350);
  input.addEventListener('input', doSearch);

  /* لو جاي من بحث الهيدر */
  const preQ = sessionStorage.getItem('rawsh_explore_q');
  if (preQ) {
    sessionStorage.removeItem('rawsh_explore_q');
    input.value = preQ;
    doSearch();
  }
  setTimeout(() => input.focus(), 100);

  return () => cleanups.forEach((f) => f?.());
}

/* ============================================================
   صفحة الهاشتاج
   ============================================================ */
export function tagPage(root, { tag }) {
  const cleanups = [];
  tag = decodeURIComponent(tag);
  root.append(pageTitle(`#${tag}`, true));
  const list = el('div');
  const sentinel = el('div');
  root.append(list, sentinel);
  cleanups.push(observeViews(list));

  const st = { cursor: null, loading: false };
  async function loadMore() {
    if (st.loading) return true;
    st.loading = true;
    const spin = spinnerRow();
    list.append(spin);
    let more = false;
    try {
      const res = await api.tagPosts(tag, st.cursor);
      st.cursor = res.cursor;
      res.items.forEach((p) => list.append(postCard(p)));
      more = !!res.cursor;
    } catch (err) { console.error(err); }
    spin.remove();
    if (!list.querySelector('.post-card')) list.append(emptyState('🏜️', 'مفيش بوستات بالهاشتاج ده', 'كن أول واحد يستخدمه!'));
    st.loading = false;
    return more;
  }
  const inf = infiniteScroll(sentinel, loadMore);
  cleanups.push(inf.stop);
  loadMore();
  return () => cleanups.forEach((f) => f?.());
}

/* ============================================================
   الإشعارات
   ============================================================ */
const NOTIF_META = {
  like: { e: '❤️', c: 'var(--pk)', t: 'عمل لايك على بوستك' },
  comment: { e: '💬', c: 'var(--bl)', t: 'علّق على بوستك' },
  reply: { e: '↩️', c: 'var(--cy)', t: 'رد على تعليقك' },
  comment_like: { e: '💗', c: 'var(--pk)', t: 'حب تعليقك' },
  follow: { e: '⭐', c: 'var(--yl)', t: 'بدأ يتابعك' },
  repost: { e: '🔁', c: 'var(--gr)', t: 'عمل ريبوست لبوستك' },
  quote: { e: '✍️', c: 'var(--pu)', t: 'اقتبس بوستك' },
  mention: { e: '📣', c: 'var(--or)', t: 'منشنك' },
};

export function notificationsPage(root) {
  const cleanups = [];
  const markBtn = el('button', { class: 'btn btn-sm', text: 'علّم الكل مقروء ✓' });
  markBtn.addEventListener('click', () => api.markAllNotifsRead().then(() => {
    root.querySelectorAll('.notif-row.unread').forEach((r) => r.classList.remove('unread'));
  }));
  const title = pageTitle('الإشعارات 🔔');
  title.append(el('span', { class: 'grow' }), markBtn);
  root.append(title);

  const list = el('div');
  const sentinel = el('div');
  root.append(list, sentinel);

  const notifRow = (n) => {
    const meta = NOTIF_META[n.type] || { e: '🔔', c: 'var(--or)', t: '' };
    const row = el('div', { class: 'notif-row' + (n.is_read ? '' : ' unread') },
      el('div', { class: 'notif-ico', style: { '--nc': meta.c }, text: meta.e }),
      avatarEl(n.actor, 36),
      el('div', { class: 'notif-body' },
        el('div', { html: `<span class="n-actor">${esc(n.actor?.display_name || 'حد')}</span> ${meta.t}` }),
        n.post?.content ? el('div', { class: 'n-snippet', text: n.post.content.slice(0, 120) }) : null,
      ),
      el('span', { class: 'notif-time', text: timeAgo(n.created_at) }),
    );
    row.addEventListener('click', () => {
      location.hash = n.post_id ? `#/p/${n.post_id}` : `#/u/${n.actor?.username || ''}`;
    });
    return row;
  };

  const st = { before: null, loading: false };
  async function loadMore() {
    if (st.loading) return true;
    st.loading = true;
    const spin = spinnerRow();
    list.append(spin);
    let more = false;
    try {
      const rows = await api.notifications(st.before);
      if (rows.length) st.before = rows[rows.length - 1].created_at;
      rows.forEach((n) => list.append(notifRow(n)));
      more = rows.length >= 30;
    } catch (err) { console.error(err); }
    spin.remove();
    if (!list.querySelector('.notif-row')) list.append(emptyState('🔕', 'مفيش إشعارات', 'لما حد يتفاعل معاك هتلاقي كل حاجة هنا'));
    st.loading = false;
    return more;
  }
  const inf = infiniteScroll(sentinel, loadMore);
  cleanups.push(inf.stop);
  loadMore().then(() => setTimeout(() => api.markAllNotifsRead(), 900));

  /* إشعار جديد لايف */
  cleanups.push(store.on('notif', async (n) => {
    try {
      const rows = await api.notifications();
      const fresh = rows.find((x) => x.id === n.id);
      if (fresh) list.prepend(notifRow(fresh));
    } catch {}
  }));

  return () => cleanups.forEach((f) => f?.());
}

/* ============================================================
   المحفوظات
   ============================================================ */
export function bookmarksPage(root) {
  const cleanups = [];
  root.append(pageTitle('المحفوظات 🔖'));
  const list = el('div');
  const sentinel = el('div');
  root.append(list, sentinel);
  cleanups.push(observeViews(list));

  const st = { cursor: null, loading: false };
  async function loadMore() {
    if (st.loading) return true;
    st.loading = true;
    const spin = spinnerRow();
    list.append(spin);
    let more = false;
    try {
      const res = await api.bookmarkedPosts(st.cursor);
      st.cursor = res.cursor;
      res.items.forEach((p) => list.append(postCard(p)));
      more = !!res.cursor;
    } catch (err) { console.error(err); }
    spin.remove();
    if (!list.querySelector('.post-card')) list.append(emptyState('🔖', 'مفيش محفوظات', 'دوس على أيقونة الحفظ في أي بوست يعجبك'));
    st.loading = false;
    return more;
  }
  const inf = infiniteScroll(sentinel, loadMore);
  cleanups.push(inf.stop);
  loadMore();
  return () => cleanups.forEach((f) => f?.());
}

/* ============================================================
   404
   ============================================================ */
export function notFoundPage(root) {
  root.append(el('div', { class: 'notfound' },
    el('div', { class: 'nf-title', text: 'للأسف 🌚' }),
    el('p', { class: 'disp-b', style: { fontSize: '19px' }, text: 'الصفحة دي مش موجودة… بعد العيد معلش' }),
    el('button', { class: 'btn btn-or', text: 'ارجع للرئيسية ✦', onclick: () => { location.hash = '#/'; } }),
  ));
}

/* ---------- هيلبرز ---------- */
function pageTitle(txt, withBack = false) {
  const t = el('div', { class: 'page-title' });
  if (withBack || history.length > 1) {
    t.append(el('button', {
      class: 'btn btn-icon btn-ghost back-btn', html: icon('back'), title: 'ارجع',
      onclick: () => { if (history.length > 1) history.back(); else location.hash = '#/'; },
    }));
  }
  t.append(el('span', { text: txt }));
  return t;
}
function sectionTitle(txt) {
  return el('div', { class: 'disp-b', style: { fontSize: '17px', margin: '4px 0 12px' }, text: txt });
}
