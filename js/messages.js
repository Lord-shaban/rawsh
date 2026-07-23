// روش — الرسايل: إنبوكس + شات ريل تايم كامل
// (رد، تفاعلات، تعديل، حذف، نسخ، معاينة صورة، إرسال متفائل، سكرول ذكي)
import { el, esc, linkify, timeAgo, dayLabel, modal, toast, toastErr, sfx, autoResize, debounce, throttle, pickFile, lightbox, confirmDlg, copy, dropMenu, emojiPicker } from './lib.js';
import { store, api, arErr, convOtherId, convUnread, cachedProfile, profilesByIds, subscribeConversation, setActiveConv } from './sb.js';
import { avatarEl, nameHTML, icon, emptyState, spinnerRow, userRow } from './components.js';

const QUICK_REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '😢', '🙏', '💯'];

export function messagesPage(root, { id: openId = null } = {}) {
  const cleanups = [];
  const layout = el('div', { class: 'dm-layout' + (openId ? ' show-chat' : '') });
  root.append(layout);

  const listPane = el('div', { class: 'dm-list' });
  const chatPane = el('div', { class: 'chat-pane' });
  layout.append(listPane, chatPane);

  /* ==================== قايمة المحادثات ==================== */
  const newBtn = el('button', { class: 'btn btn-sm btn-or', html: icon('pencil') + '<span>جديدة</span>' });
  newBtn.addEventListener('click', () => openNewChatModal());
  listPane.append(el('div', { class: 'dm-list-head' }, el('span', { text: 'الرسايل 💌' }), newBtn));

  const convList = el('div');
  listPane.append(convList);

  async function renderConvs() {
    convList.innerHTML = '';
    convList.append(spinnerRow());
    let convs = [];
    try { convs = await api.conversations(); } catch (err) { console.error(err); }
    convList.innerHTML = '';
    if (!convs.length) {
      convList.append(emptyState('💌', 'مفيش رسايل لسه', 'ابعت لحد وابدأ الدردشة'));
      return;
    }
    convs.forEach((c) => convList.append(convRow(c)));
  }

  function convRow(c) {
    const other = cachedProfile(convOtherId(c));
    const unread = convUnread(c);
    const preview = c.last_message || 'ابدأ الكلام ✦';
    const row = el('div', { class: 'conv-row' + (unread ? ' unread' : '') + (c.id === openId ? ' active' : ''), dataset: { cid: c.id } },
      avatarEl(other, 44, { link: false, presence: true }),
      el('div', { class: 'c-info' },
        el('div', { class: 'c-name', html: nameHTML(other) }),
        el('div', { class: 'c-last', text: (c.last_sender === store.me.id ? 'أنت: ' : '') + preview }),
      ),
      el('div', { class: 'c-side' },
        el('span', { class: 'c-time', text: c.last_sender ? timeAgo(c.updated_at) : '' }),
        unread ? el('span', { class: 'c-dot' }) : null,
      ),
    );
    row.addEventListener('click', () => { location.hash = `#/messages/${c.id}`; });
    return row;
  }

  // تحديث صف واحد بدل إعادة رسم القايمة كلها (أداء + مفيش وميض)
  function upsertConvRow(c) {
    if (!convList.querySelector('.conv-row')) { renderConvs(); return; }
    const existing = convList.querySelector(`.conv-row[data-cid="${c.id}"]`);
    const fresh = convRow(c);
    existing?.remove();
    convList.prepend(fresh);
  }
  cleanups.push(store.on('conv', (c) => upsertConvRow(c)));
  renderConvs();

  /* ==================== الشات المفتوح ==================== */
  let convSub = null;
  const openChat = async (convId) => {
    setActiveConv(convId);
    convSub?.unsubscribe();
    chatPane.innerHTML = '';
    chatPane.append(spinnerRow());

    let conv = store.convs.get(convId);
    if (!conv) {
      try { conv = (await api.conversations()).find((c) => c.id === convId); } catch {}
    }
    if (!conv) {
      chatPane.innerHTML = '';
      chatPane.append(emptyState('👻', 'المحادثة دي مش موجودة'));
      return;
    }
    const otherId = convOtherId(conv);
    await profilesByIds([otherId]).catch(() => {});
    const other = cachedProfile(otherId) || { display_name: 'مستخدم', username: '' };

    chatPane.innerHTML = '';

    /* ---------- الهيدر ---------- */
    const statusEl = el('div', { class: 'ch-status' });
    let typingActive = false;
    const updateStatus = () => {
      if (typingActive) { statusEl.textContent = 'بيكتب دلوقتي…'; statusEl.className = 'ch-status on'; return; }
      const on = store.online.has(otherId);
      statusEl.textContent = on ? 'أونلاين دلوقتي 🟢' : 'آخر ظهور ' + (other._lastSeen || 'من فترة');
      statusEl.className = 'ch-status' + (on ? ' on' : '');
    };
    updateStatus();
    cleanups.push(store.on('presence', updateStatus));

    const head = el('div', { class: 'chat-head' },
      el('button', { class: 'btn btn-ghost btn-icon', html: icon('back'), title: 'ارجع', onclick: () => { location.hash = '#/messages'; } }),
      avatarEl(other, 44, { presence: true }),
      el('div', { class: 'ch-info', style: { cursor: 'pointer' }, onclick: () => { location.hash = `#/u/${other.username}`; } },
        el('div', { class: 'ch-name', html: nameHTML(other) }),
        statusEl,
      ),
      el('div', { class: 'ch-actions' },
        el('button', { class: 'btn btn-ghost btn-icon', html: icon('user'), title: 'الملف الشخصي', onclick: () => { location.hash = `#/u/${other.username}`; } }),
      ),
    );
    chatPane.append(head);

    /* ---------- منطقة الرسايل ---------- */
    const msgsBox = el('div', { class: 'chat-msgs' });
    const scrollBtn = el('button', { class: 'scroll-down-btn', title: 'انزل لآخر المحادثة', html: icon('chevronDown') + '<span class="sd-count hidden">0</span>' });
    chatPane.append(msgsBox, scrollBtn);

    const msgsById = new Map();   // id → msg
    const seen = new Set();       // ids اتعرضت
    let lastShown = null;         // آخر رسالة اتضافت (للتجميع + فواصل الأيام)
    let stick = true;             // ملزوقين تحت؟
    let newCount = 0;             // رسايل جديدة وانت فوق

    /* ---------- سكرول ---------- */
    const isNearBottom = () => msgsBox.scrollHeight - msgsBox.scrollTop - msgsBox.clientHeight < 130;
    const scrollToBottom = (smooth = false) => {
      newCount = 0;
      updateScrollBtn();
      msgsBox.scrollTo({ top: msgsBox.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    };
    const updateScrollBtn = () => {
      scrollBtn.classList.toggle('show', !stick);
      const badge = scrollBtn.querySelector('.sd-count');
      badge.classList.toggle('hidden', newCount === 0);
      badge.textContent = newCount > 99 ? '99+' : newCount;
    };
    scrollBtn.addEventListener('click', () => scrollToBottom(true));

    /* ---------- تعريف الرسالة ---------- */
    const otherName = () => other.display_name || other.username || 'مستخدم';
    const senderName = (id) => (id === store.me.id ? 'أنت' : otherName());

    // اقتباس الرد جوه الفقاعة
    const replyQuote = (msg) => {
      const orig = msgsById.get(msg.reply_to);
      const snippet = orig
        ? (orig.media_url && !orig.content ? '📷 صورة' : (orig.content || '').slice(0, 90))
        : 'رسالة';
      const q = el('div', { class: 'msg-reply' },
        el('span', { class: 'mr-name', text: orig ? senderName(orig.sender_id) : '↩︎ رد' }),
        el('span', { class: 'mr-text', text: snippet }),
      );
      q.addEventListener('click', (e) => { e.stopPropagation(); if (msg.reply_to) scrollToMsg(msg.reply_to); });
      return q;
    };

    const metaEl = (msg, pending) => {
      const mine = msg.sender_id === store.me.id;
      return el('div', { class: 'msg-meta' },
        msg.edited_at ? el('span', { class: 'edited', text: 'معدّلة · ' }) : null,
        el('span', { class: 'm-time', text: pending ? '🕐' : new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' }) }),
        (mine && !pending) ? el('span', { class: 'read-mark', dataset: { t: msg.created_at }, text: '✓' }) : null,
      );
    };

    const reactionsEl = (msg) => {
      const wrap = el('div', { class: 'msg-reactions' });
      const rx = msg.reactions || {};
      for (const [emoji, users] of Object.entries(rx)) {
        if (!users?.length) continue;
        const mineReact = users.includes(store.me.id);
        const pill = el('button', { class: 'reaction-pill' + (mineReact ? ' mine' : ''), title: users.length + ' تفاعل' },
          el('span', { text: emoji }),
          el('span', { class: 'rc-count', text: users.length }),
        );
        pill.addEventListener('click', (e) => { e.stopPropagation(); react(msg, emoji); });
        wrap.append(pill);
      }
      return wrap;
    };

    // يبني صف الرسالة كامل
    const renderMessage = (msg, prev, { pending = false } = {}) => {
      const mine = msg.sender_id === store.me.id;
      const grouped = prev && prev.sender_id === msg.sender_id
        && dayLabel(prev.created_at) === dayLabel(msg.created_at)
        && (new Date(msg.created_at) - new Date(prev.created_at)) < 4 * 60000;

      const bubble = el('div', { class: 'msg ' + (mine ? 'mine' : 'theirs') });
      if (msg.reply_to) bubble.append(replyQuote(msg));
      if (msg.media_url) {
        const img = el('img', { class: 'msg-img', src: msg.media_url, loading: 'lazy' });
        img.addEventListener('click', () => { if (!pending) lightbox([{ type: 'image', url: msg.media_url }]); });
        img.addEventListener('load', () => { if (stick) scrollToBottom(); });
        bubble.append(img);
      }
      if (msg.content) bubble.append(el('div', { class: 'msg-text', html: linkify(msg.content) }));
      bubble.append(metaEl(msg, pending));
      if (pending) bubble.style.opacity = '.62';

      const col = el('div', { class: 'msg-col' }, bubble, reactionsEl(msg));

      const row = el('div', {
        class: 'msg-row ' + (mine ? 'mine' : 'theirs') + (grouped ? ' grouped' : ''),
        dataset: { mid: msg.id },
      });
      if (!mine) row.append(el('div', { class: 'msg-avatar' }, avatarEl(other, 28, { link: false })));
      row.append(col);
      if (!pending) row.append(toolsEl(msg, row, bubble));

      // لمس مطوّل على الموبايل = قايمة الأكشنز
      if (!pending) attachLongPress(bubble, () => openActions(msg, bubble));

      return row;
    };

    // أدوات الهوفر (ديسكتوب)
    const toolsEl = (msg, row, bubble) => {
      const tools = el('div', { class: 'msg-tools' });
      const reactBtn = el('button', { html: icon('smile'), title: 'تفاعل' });
      reactBtn.addEventListener('click', (e) => { e.stopPropagation(); openReactPicker(msg, reactBtn); });
      const replyBtn = el('button', { html: icon('reply'), title: 'رد' });
      replyBtn.addEventListener('click', (e) => { e.stopPropagation(); startReply(msg); });
      const moreBtn = el('button', { html: icon('more'), title: 'المزيد' });
      moreBtn.addEventListener('click', (e) => { e.stopPropagation(); openActions(msg, moreBtn); });
      tools.append(reactBtn, replyBtn, moreBtn);
      return tools;
    };

    // إضافة رسالة في الآخر
    const appendMsg = (msg, { pending = false } = {}) => {
      if (!pending && seen.has(msg.id)) return null;
      if (!pending) { seen.add(msg.id); msgsById.set(msg.id, msg); }
      const day = dayLabel(msg.created_at);
      if (!lastShown || dayLabel(lastShown.created_at) !== day) {
        msgsBox.append(el('span', { class: 'msg-day', text: day }));
      }
      const row = renderMessage(msg, lastShown, { pending });
      msgsBox.append(row);
      lastShown = msg;
      return row;
    };

    /* ---------- التفاعلات ---------- */
    let reactBusy = false;
    async function react(msg, emoji) {
      if (reactBusy) return;
      reactBusy = true;
      try {
        const rx = await api.toggleReaction(msg.id, emoji);
        msg.reactions = rx;
        refreshReactions(msg);
        sfx.pop();
      } catch (err) { toastErr(arErr(err)); }
      reactBusy = false;
    }
    function refreshReactions(msg) {
      const row = msgsBox.querySelector(`.msg-row[data-mid="${msg.id}"]`);
      if (!row) return;
      row.querySelector('.msg-reactions')?.replaceWith(reactionsEl(msg));
    }
    function openReactPicker(msg, anchor) {
      // شريط تفاعلات سريعة
      const bar = el('div', { class: 'react-quick-bar' });
      QUICK_REACTIONS.forEach((e) => {
        bar.append(el('button', { text: e, onclick: (ev) => { ev.stopPropagation(); pop.remove(); document.removeEventListener('mousedown', closer); react(msg, e); } }));
      });
      bar.append(el('button', { class: 'more-emoji', html: icon('plus'), title: 'إيموجي تانية', onclick: (ev) => { ev.stopPropagation(); pop.remove(); document.removeEventListener('mousedown', closer); emojiPicker(anchor, (e) => react(msg, e)); } }));
      const pop = el('div', { class: 'react-quick-pop' }, bar);
      document.body.append(pop);
      const r = anchor.getBoundingClientRect();
      pop.style.top = Math.max(8, r.top - 52) + 'px';
      pop.style.left = Math.min(Math.max(8, r.left - 60), window.innerWidth - pop.offsetWidth - 8) + 'px';
      const closer = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('mousedown', closer); } };
      setTimeout(() => document.addEventListener('mousedown', closer), 10);
    }

    /* ---------- قايمة أكشنز الرسالة ---------- */
    function openActions(msg, anchor) {
      const mine = msg.sender_id === store.me.id;
      const items = [
        { label: 'تفاعل 😊', icon: icon('smile'), action: () => openReactPicker(msg, anchor) },
        { label: 'رد', icon: icon('reply'), action: () => startReply(msg) },
      ];
      if (msg.content) items.push({ label: 'انسخ النص', icon: icon('copy'), action: async () => { await copy(msg.content); toast('اتنسخ ✦', { emoji: '📋' }); } });
      if (mine && msg.content && !msg.media_url) items.push({ label: 'عدّل', icon: icon('pencil'), action: () => startEdit(msg) });
      if (mine) items.push('---', { label: 'امسح', icon: icon('trash'), danger: true, action: () => removeMessage(msg) });
      dropMenu(anchor, items);
    }

    async function removeMessage(msg) {
      if (!(await confirmDlg('تمسح الرسالة دي؟ (بتتمسح عند الطرفين)'))) return;
      try {
        await api.deleteMessage(msg.id);
        dropMessageEl(msg.id);
      } catch (err) { toastErr(arErr(err)); }
    }
    function dropMessageEl(id) {
      msgsBox.querySelector(`.msg-row[data-mid="${id}"]`)?.remove();
      seen.delete(id); msgsById.delete(id);
    }

    /* ---------- الرد والتعديل (شريط السياق) ---------- */
    let replyTo = null;   // msg
    let editing = null;   // msg
    const ctxBar = el('div', { class: 'chat-context-bar hidden' });
    const renderCtxBar = () => {
      ctxBar.innerHTML = '';
      const active = editing || replyTo;
      ctxBar.classList.toggle('hidden', !active);
      ctxBar.classList.toggle('editing', !!editing);
      if (!active) return;
      ctxBar.append(
        el('div', { class: 'ccb-strip' }),
        el('div', { class: 'ccb-info' },
          el('div', { class: 'ccb-title', text: editing ? '✏️ تعديل الرسالة' : '↩︎ رد على ' + senderName(replyTo.sender_id) }),
          el('div', { class: 'ccb-text', text: (active.media_url && !active.content) ? '📷 صورة' : (active.content || '').slice(0, 100) }),
        ),
        el('button', { class: 'btn btn-ghost btn-icon', html: icon('x'), title: 'إلغاء', onclick: cancelCtx }),
      );
    };
    function startReply(msg) {
      editing = null; replyTo = msg;
      renderCtxBar(); ta.focus();
    }
    function startEdit(msg) {
      replyTo = null; editing = msg;
      ta.value = msg.content; autoResize(ta);
      renderCtxBar(); ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
    function cancelCtx() {
      if (editing) { ta.value = ''; ta.style.height = 'auto'; }
      replyTo = null; editing = null;
      renderCtxBar();
    }

    /* ---------- سكرول لرسالة معينة ---------- */
    function scrollToMsg(id) {
      const bubble = msgsBox.querySelector(`.msg-row[data-mid="${id}"] .msg`);
      if (!bubble) { toast('الرسالة الأصلية مش محمّلة', { emoji: '🔍' }); return; }
      bubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bubble.classList.remove('highlight');
      void bubble.offsetWidth;
      bubble.classList.add('highlight');
    }

    /* ---------- تحميل الرسايل ---------- */
    let msgs = [];
    try { msgs = await api.messages(convId); } catch (err) { console.error(err); }
    msgs.forEach((m) => appendMsg(m));
    if (!msgs.length) {
      msgsBox.append(el('div', { class: 'center muted', style: { padding: '34px 20px', textAlign: 'center' }, text: `ده أول كلام بينك وبين ${otherName()} — قول هاي 👋` }));
    }
    // انزل تحت بعد ما الـ layout يستقر
    requestAnimationFrame(() => scrollToBottom());

    /* ---------- علامات القراءة ---------- */
    const updateReadMarks = () => {
      const theirRead = conv.user1 === otherId ? conv.user1_read_at : conv.user2_read_at;
      const t = new Date(theirRead).getTime();
      msgsBox.querySelectorAll('.read-mark').forEach((m) => {
        const seenIt = new Date(m.dataset.t).getTime() <= t;
        m.textContent = seenIt ? '✓✓' : '✓';
        m.classList.toggle('seen', seenIt);
      });
    };
    updateReadMarks();
    cleanups.push(store.on('conv', (c) => {
      if (c.id !== convId) return;
      Object.assign(conv, c);
      updateReadMarks();
    }));

    /* ---------- سكرول: تحميل الأقدم + زرار النزول ---------- */
    let oldest = msgs[0]?.created_at || null;
    let loadingOld = false;
    const loadOlder = async () => {
      if (loadingOld || !oldest) return;
      loadingOld = true;
      const spin = el('div', { class: 'center', style: { padding: '8px' } }, el('span', { class: 'spin', text: '💿' }));
      msgsBox.prepend(spin);
      const keepH = msgsBox.scrollHeight;
      try {
        const older = await api.messages(convId, oldest);
        spin.remove();
        if (older.length) {
          oldest = older[0].created_at;
          const frag = document.createDocumentFragment();
          let prev = null, prevDay = '';
          for (const m of older) {
            if (seen.has(m.id)) continue;
            seen.add(m.id); msgsById.set(m.id, m);
            const day = dayLabel(m.created_at);
            if (day !== prevDay) { prevDay = day; frag.append(el('span', { class: 'msg-day', text: day })); }
            frag.append(renderMessage(m, prev));
            prev = m;
          }
          msgsBox.prepend(frag);
          msgsBox.scrollTop = msgsBox.scrollHeight - keepH;
          updateReadMarks();
        } else { oldest = null; }
      } catch { spin.remove(); }
      loadingOld = false;
    };

    msgsBox.addEventListener('scroll', () => {
      stick = isNearBottom();
      if (stick && newCount) { newCount = 0; }
      updateScrollBtn();
      if (msgsBox.scrollTop < 80) loadOlder();
    }, { passive: true });

    /* ---------- مؤشر الكتابة ---------- */
    const typingRow = el('div', { class: 'typing-bubble hidden' }, el('i'), el('i'), el('i'));
    let typingTimer = null;
    const showTyping = () => {
      typingActive = true;
      updateStatus();
      typingRow.classList.remove('hidden');
      msgsBox.append(typingRow); // دايمًا في الآخر
      if (stick) scrollToBottom();
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { typingActive = false; typingRow.classList.add('hidden'); updateStatus(); }, 2800);
    };

    /* ---------- قراءة المحادثة (throttled) ---------- */
    const markRead = throttle(() => api.markConvRead(convId), 1500);

    /* ---------- الاشتراك اللحظي ---------- */
    convSub = subscribeConversation(convId, {
      onMessage: (msg) => {
        typingActive = false; typingRow.classList.add('hidden');
        if (seen.has(msg.id)) return;
        // رسالتي رجعت من الريل تايم قبل ما الـ promise يخلّص → صالِح الفقاعة المؤقتة
        if (msg.sender_id === store.me.id) { seen.add(msg.id); msgsById.set(msg.id, msg); if (reconcile(msg)) return; }
        const wasBottom = stick;
        appendMsg(msg);
        if (msg.sender_id === store.me.id || wasBottom) scrollToBottom();
        else { newCount++; updateScrollBtn(); }
        if (msg.sender_id !== store.me.id) { sfx.msg(); markRead(); }
      },
      onUpdate: (msg) => {
        // تفاعل أو تعديل من الطرف التاني
        if (!msgsById.has(msg.id)) return;
        Object.assign(msgsById.get(msg.id), msg);
        refreshReactions(msg);
        const textEl = msgsBox.querySelector(`.msg-row[data-mid="${msg.id}"] .msg-text`);
        if (textEl && msg.content) textEl.innerHTML = linkify(msg.content);
        const meta = msgsBox.querySelector(`.msg-row[data-mid="${msg.id}"] .msg-meta`);
        if (meta && msg.edited_at && !meta.querySelector('.edited')) {
          meta.prepend(el('span', { class: 'edited', text: 'معدّلة · ' }));
        }
      },
      onDelete: (old) => { if (old?.id) dropMessageEl(old.id); },
      onTyping: (p) => { if (p?.user_id !== store.me.id) showTyping(); },
    });

    /* ==================== الإرسال المتفائل ==================== */
    const pending = [];
    function reconcile(realMsg) {
      const p = pending.shift();
      if (!p) return false;
      if (p.objectUrl) URL.revokeObjectURL(p.objectUrl);
      msgsById.set(realMsg.id, realMsg);
      const fresh = renderMessage(realMsg, p.prev);
      p.row.replaceWith(fresh);
      if (stick) scrollToBottom();
      return true;
    }

    async function sendOptimistic({ text = '', file = null }) {
      const rt = replyTo;
      const objectUrl = file ? URL.createObjectURL(file) : null;
      const temp = {
        id: 'temp-' + Math.random().toString(36).slice(2),
        sender_id: store.me.id, content: text, media_url: objectUrl,
        reply_to: rt?.id || null, created_at: new Date().toISOString(), reactions: {},
      };
      const prevForRow = lastShown;
      const row = appendMsg(temp, { pending: true });
      pending.push({ row, prev: prevForRow, objectUrl });
      stick = true; scrollToBottom();
      cancelCtx();

      try {
        let mediaUrl = null;
        if (file) { const up = await api.uploadImage(file, { maxW: 1280 }); mediaUrl = up.url; }
        const real = await api.sendMessage(convId, text, mediaUrl, rt?.id || null);
        sfx.send();
        if (!seen.has(real.id)) { seen.add(real.id); reconcile(real); }
        else { // الريل تايم سبقنا وصالح الفقاعة بالفعل
          const p = pending.shift(); if (p?.objectUrl) URL.revokeObjectURL(p.objectUrl); p?.row.remove();
        }
      } catch (err) {
        const idx = pending.findIndex((p) => p.row === row);
        if (idx >= 0) { const p = pending.splice(idx, 1)[0]; if (p.objectUrl) URL.revokeObjectURL(p.objectUrl); }
        row.remove();
        if (!file) { ta.value = text; autoResize(ta); }
        toastErr(arErr(err));
      }
    }

    /* ==================== شريط الإدخال ==================== */
    const emojiBtn = el('button', { class: 'btn btn-ghost btn-icon', html: icon('smile'), title: 'إيموجي' });
    emojiBtn.addEventListener('click', () => {
      emojiPicker(emojiBtn, (e) => {
        const s = ta.selectionStart ?? ta.value.length;
        ta.value = ta.value.slice(0, s) + e + ta.value.slice(ta.selectionEnd ?? s);
        ta.dispatchEvent(new Event('input')); ta.focus();
        ta.setSelectionRange(s + e.length, s + e.length);
      });
    });

    const imgBtn = el('button', { class: 'btn btn-ghost btn-icon', html: icon('image'), title: 'ابعت صورة' });
    imgBtn.addEventListener('click', async () => {
      const f = await pickFile('image/*');
      if (f) showImgPreview(f);
    });

    const ta = el('textarea', { class: 'textarea grow', placeholder: 'اكتب رسالة…', rows: 1, maxlength: 2000 });
    autoResize(ta);
    const sendTyping = throttle(() => convSub?.sendTyping(), 1800);
    ta.addEventListener('input', () => { if (ta.value.trim() && !editing) sendTyping(); });

    const sendBtn = el('button', { class: 'btn btn-icon btn-or', html: icon('send'), title: 'ابعت' });
    const doSend = async () => {
      const txt = ta.value.trim();
      if (!txt || sendBtn.disabled) return;
      if (editing) {
        const target = editing;
        sendBtn.disabled = true;
        try {
          await api.editMessage(target.id, txt);
          target.content = txt; target.edited_at = new Date().toISOString();
          const row = msgsBox.querySelector(`.msg-row[data-mid="${target.id}"]`);
          const textEl = row?.querySelector('.msg-text');
          if (textEl) textEl.innerHTML = linkify(txt);
          const meta = row?.querySelector('.msg-meta');
          if (meta && !meta.querySelector('.edited')) meta.prepend(el('span', { class: 'edited', text: 'معدّلة · ' }));
          ta.value = ''; ta.style.height = 'auto'; cancelCtx();
          sfx.pop();
        } catch (err) { toastErr(arErr(err)); }
        sendBtn.disabled = false; ta.focus();
        return;
      }
      ta.value = ''; ta.style.height = 'auto';
      sendOptimistic({ text: txt });
      ta.focus();
    };
    sendBtn.addEventListener('click', doSend);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
      if (e.key === 'Escape' && (editing || replyTo)) cancelCtx();
    });

    /* ---------- معاينة الصورة قبل الإرسال ---------- */
    const imgPreview = el('div', { class: 'chat-img-preview hidden' });
    function showImgPreview(file) {
      const url = URL.createObjectURL(file);
      imgPreview.innerHTML = '';
      imgPreview.classList.remove('hidden');
      const capInput = el('input', { class: 'input', placeholder: 'كابشن (اختياري)…', maxlength: 2000, style: { border: '0', background: 'transparent', padding: '4px 0' } });
      capInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendImg(); });
      const sendImg = () => {
        imgPreview.classList.add('hidden');
        URL.revokeObjectURL(url);
        sendOptimistic({ text: capInput.value.trim(), file });
      };
      imgPreview.append(
        el('img', { class: 'cip-thumb', src: url }),
        el('div', { class: 'cip-info grow' }, capInput),
        el('button', { class: 'btn btn-ghost btn-icon', html: icon('x'), title: 'إلغاء', onclick: () => { imgPreview.classList.add('hidden'); URL.revokeObjectURL(url); } }),
        el('button', { class: 'btn btn-icon btn-or', html: icon('send'), title: 'ابعت', onclick: sendImg }),
      );
      setTimeout(() => capInput.focus(), 50);
    }

    chatPane.append(imgPreview, ctxBar, el('div', { class: 'chat-input-row' }, emojiBtn, imgBtn, ta, sendBtn));
    markRead();
    setTimeout(() => ta.focus(), 100);
  };

  if (openId) openChat(openId);
  else chatPane.append(el('div', { class: 'center', style: { height: '100%' } },
    emptyState('💬', 'اختار محادثة', 'أو ابدأ واحدة جديدة من الزرار فوق')));

  cleanups.push(() => { convSub?.unsubscribe(); setActiveConv(null); });
  return () => cleanups.forEach((f) => f?.());
}

/* ---------- لمس مطوّل (موبايل) ---------- */
function attachLongPress(elm, cb) {
  let timer = null, moved = false;
  const start = () => { moved = false; timer = setTimeout(() => { if (!moved) { navigator.vibrate?.(15); cb(); } }, 480); };
  const cancel = () => clearTimeout(timer);
  elm.addEventListener('touchstart', start, { passive: true });
  elm.addEventListener('touchmove', () => { moved = true; cancel(); }, { passive: true });
  elm.addEventListener('touchend', cancel);
  elm.addEventListener('touchcancel', cancel);
}

/* ---------- مودال محادثة جديدة ---------- */
function openNewChatModal() {
  const inp = el('input', { class: 'input', placeholder: '🔍 دوّر على حد…' });
  const results = el('div', { class: 'followers-list vstack', style: { marginTop: '12px' } });
  const box = el('div', {}, inp, results);
  const m = modal({ title: 'رسالة جديدة ✍️', content: box });

  const search = debounce(async () => {
    const qs = inp.value.trim();
    results.innerHTML = '';
    if (qs.length < 2) return;
    results.append(spinnerRow());
    try {
      const users = (await api.searchUsers(qs)).filter((u) => u.id !== store.me.id);
      results.innerHTML = '';
      if (!users.length) { results.append(emptyState('🔍', 'ملقناش حد')); return; }
      users.forEach((u) => results.append(userRow(u, {
        withFollow: false,
        onClick: async () => {
          try {
            const conv = await api.openConversation(u.id);
            m.close();
            location.hash = `#/messages/${conv.id}`;
          } catch (err) { toastErr(arErr(err)); }
        },
      })));
    } catch (err) { results.innerHTML = ''; toastErr(arErr(err)); }
  }, 350);
  inp.addEventListener('input', search);
  setTimeout(() => inp.focus(), 80);
}
