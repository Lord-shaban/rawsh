// روش — الرسايل: إنبوكس + شات ريل تايم (كتابة، قراءة، صور)
import { el, esc, linkify, timeAgo, dayLabel, modal, toast, toastErr, sfx, autoResize, debounce, throttle, pickFile, lightbox, confirmDlg } from './lib.js';
import { store, api, arErr, convOtherId, convUnread, cachedProfile, profilesByIds, subscribeConversation, setActiveConv } from './sb.js';
import { avatarEl, nameHTML, icon, emptyState, spinnerRow, userRow } from './components.js';

export function messagesPage(root, { id: openId = null } = {}) {
  const cleanups = [];
  const layout = el('div', { class: 'dm-layout' + (openId ? ' show-chat' : '') });
  root.append(layout);

  /* ---------- قايمة المحادثات ---------- */
  const listPane = el('div', { class: 'dm-list' });
  const chatPane = el('div', { class: 'chat-pane' });
  layout.append(listPane, chatPane);

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
    const row = el('div', { class: 'conv-row' + (unread ? ' unread' : '') + (c.id === openId ? ' active' : ''), dataset: { cid: c.id } },
      avatarEl(other, 44, { link: false, presence: true }),
      el('div', { class: 'c-info' },
        el('div', { class: 'c-name', html: nameHTML(other) }),
        el('div', { class: 'c-last', text: (c.last_sender === store.me.id ? 'أنت: ' : '') + (c.last_message || 'ابدأ الكلام ✦') }),
      ),
      el('div', { class: 'c-side' },
        el('span', { class: 'c-time', text: c.last_sender ? timeAgo(c.updated_at) : '' }),
        unread ? el('span', { class: 'c-dot' }) : null,
      ),
    );
    row.addEventListener('click', () => { location.hash = `#/messages/${c.id}`; });
    return row;
  }

  cleanups.push(store.on('conv', () => renderConvs()));
  renderConvs();

  /* ---------- الشات المفتوح ---------- */
  let convSub = null;
  const openChat = async (convId) => {
    setActiveConv(convId);
    chatPane.innerHTML = '';
    chatPane.append(spinnerRow());

    let conv = store.convs.get(convId);
    if (!conv) {
      try {
        const convs = await api.conversations();
        conv = convs.find((c) => c.id === convId);
      } catch {}
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

    /* الهيدر */
    const statusEl = el('div', { class: 'ch-status' });
    const updateStatus = (typing = false) => {
      if (typing) { statusEl.textContent = 'بيكتب دلوقتي…'; statusEl.className = 'ch-status on'; return; }
      const on = store.online.has(otherId);
      statusEl.textContent = on ? 'أونلاين دلوقتي 🟢' : 'مش متواجد';
      statusEl.className = 'ch-status' + (on ? ' on' : '');
    };
    updateStatus();
    cleanups.push(store.on('presence', () => updateStatus()));

    const head = el('div', { class: 'chat-head' },
      el('button', { class: 'btn btn-ghost btn-icon', html: icon('back'), title: 'ارجع', onclick: () => { location.hash = '#/messages'; } }),
      avatarEl(other, 44, { presence: true }),
      el('div', { class: 'ch-info', style: { cursor: 'pointer' }, onclick: () => { location.hash = `#/u/${other.username}`; } },
        el('div', { class: 'ch-name', html: nameHTML(other) }),
        statusEl,
      ),
    );
    chatPane.append(head);

    /* الرسايل */
    const msgsBox = el('div', { class: 'chat-msgs' });
    chatPane.append(msgsBox);

    let msgs = [];
    try { msgs = await api.messages(convId); } catch (err) { console.error(err); }

    let lastDay = '';
    const seenIds = new Set();
    const appendMsg = (msg, { scroll = true } = {}) => {
      if (seenIds.has(msg.id)) return;
      seenIds.add(msg.id);
      const day = dayLabel(msg.created_at);
      if (day !== lastDay) { lastDay = day; msgsBox.append(el('span', { class: 'msg-day', text: day })); }
      msgsBox.append(msgEl(msg));
      if (scroll) msgsBox.scrollTop = msgsBox.scrollHeight;
    };

    const msgEl = (msg) => {
      const mine = msg.sender_id === store.me.id;
      const bubble = el('div', { class: 'msg ' + (mine ? 'mine' : 'theirs'), dataset: { mid: msg.id } });
      if (msg.media_url) {
        bubble.append(el('img', { class: 'msg-img', src: msg.media_url, loading: 'lazy', onclick: () => lightbox([{ type: 'image', url: msg.media_url }]) }));
      }
      if (msg.content) bubble.append(el('div', { html: linkify(msg.content) }));
      bubble.append(el('div', { class: 'msg-meta' },
        el('span', { text: new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' }) }),
        mine ? el('span', { class: 'read-mark', dataset: { t: msg.created_at }, text: '✓' }) : null,
      ));
      if (mine) {
        bubble.addEventListener('contextmenu', async (e) => {
          e.preventDefault();
          if (await confirmDlg('تمسح الرسالة دي؟ (بتتمسح عند الطرفين)')) {
            try { await api.deleteMessage(msg.id); bubble.remove(); } catch (err) { toastErr(arErr(err)); }
          }
        });
      }
      return bubble;
    };

    msgs.forEach((m) => appendMsg(m, { scroll: false }));
    msgsBox.scrollTop = msgsBox.scrollHeight;
    if (!msgs.length) msgsBox.append(el('div', { class: 'center muted', style: { padding: '30px' }, text: `ده أول كلام بينك وبين ${other.display_name} — قول هاي 👋` }));

    /* علامات القراءة */
    const updateReadMarks = () => {
      const theirRead = conv.user1 === otherId ? conv.user1_read_at : conv.user2_read_at;
      msgsBox.querySelectorAll('.read-mark').forEach((m) => {
        m.textContent = new Date(m.dataset.t) <= new Date(theirRead) ? '✓✓ شافها' : '✓';
      });
    };
    updateReadMarks();
    cleanups.push(store.on('conv', (c) => { if (c.id === convId) { Object.assign(conv, c); updateReadMarks(); } }));

    /* تحميل الأقدم عند السحب لفوق */
    let oldest = msgs[0]?.created_at || null;
    let loadingOld = false;
    msgsBox.addEventListener('scroll', async () => {
      if (msgsBox.scrollTop > 60 || loadingOld || !oldest) return;
      loadingOld = true;
      try {
        const older = await api.messages(convId, oldest);
        if (older.length) {
          oldest = older[0].created_at;
          const keep = msgsBox.scrollHeight;
          const frag = document.createDocumentFragment();
          let prevDay = '';
          older.forEach((msg) => {
            if (seenIds.has(msg.id)) return;
            seenIds.add(msg.id);
            const day = dayLabel(msg.created_at);
            if (day !== prevDay) { prevDay = day; frag.append(el('span', { class: 'msg-day', text: day })); }
            frag.append(msgEl(msg));
          });
          msgsBox.prepend(frag);
          msgsBox.scrollTop = msgsBox.scrollHeight - keep;
        } else oldest = null;
      } catch {}
      loadingOld = false;
    });

    /* مؤشر الكتابة */
    const typingRow = el('div', { class: 'msg theirs typing-bubble hidden' }, el('i'), el('i'), el('i'));
    msgsBox.append(typingRow);
    let typingTimer = null;
    const showTyping = () => {
      typingRow.classList.remove('hidden');
      msgsBox.append(typingRow);
      msgsBox.scrollTop = msgsBox.scrollHeight;
      updateStatus(true);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { typingRow.classList.add('hidden'); updateStatus(); }, 2600);
    };

    /* الاشتراك اللحظي */
    convSub?.unsubscribe();
    convSub = subscribeConversation(convId, {
      onMessage: (msg) => {
        typingRow.classList.add('hidden');
        appendMsg(msg);
        if (msg.sender_id !== store.me.id) {
          sfx.msg();
          api.markConvRead(convId);
        }
      },
      onTyping: (p) => { if (p?.user_id !== store.me.id) showTyping(); },
    });

    /* الإدخال */
    const ta = el('textarea', { class: 'textarea grow', placeholder: 'اكتب رسالة…', rows: 1, maxlength: 2000 });
    autoResize(ta);
    const sendTyping = throttle(() => convSub?.sendTyping(), 1800);
    ta.addEventListener('input', () => { if (ta.value.trim()) sendTyping(); });

    const imgBtn = el('button', { class: 'btn btn-ghost btn-icon', html: icon('image'), title: 'ابعت صورة' });
    imgBtn.addEventListener('click', async () => {
      const f = await pickFile('image/*');
      if (!f) return;
      imgBtn.disabled = true;
      try {
        const up = await api.uploadImage(f, { maxW: 1280 });
        const msg = await api.sendMessage(convId, ta.value.trim(), up.url);
        ta.value = ''; ta.style.height = 'auto';
        appendMsg(msg);
        sfx.send();
      } catch (err) { toastErr(arErr(err)); }
      imgBtn.disabled = false;
    });

    const sendBtn = el('button', { class: 'btn btn-icon btn-or', html: icon('send'), title: 'ابعت' });
    const doSend = async () => {
      const txt = ta.value.trim();
      if (!txt || sendBtn.disabled) return;
      sendBtn.disabled = true;
      ta.value = ''; ta.style.height = 'auto';
      try {
        const msg = await api.sendMessage(convId, txt);
        appendMsg(msg);
        sfx.send();
      } catch (err) { toastErr(arErr(err)); ta.value = txt; }
      sendBtn.disabled = false;
      ta.focus();
    };
    sendBtn.addEventListener('click', doSend);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });

    chatPane.append(el('div', { class: 'chat-input-row' }, imgBtn, ta, sendBtn));
    api.markConvRead(convId);
    setTimeout(() => ta.focus(), 100);
  };

  if (openId) openChat(openId);
  else chatPane.append(el('div', { class: 'center', style: { height: '100%' } },
    emptyState('💬', 'اختار محادثة', 'أو ابدأ واحدة جديدة من الزرار فوق')));

  cleanups.push(() => { convSub?.unsubscribe(); setActiveConv(null); });
  return () => cleanups.forEach((f) => f?.());
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
