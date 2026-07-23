// روش — نافذة إنشاء البوستات: نص + صور/فيديو + صوت + استطلاع + إيموجي + منشن
import { el, esc, modal, toast, toastErr, sfx, autoResize, pickFile, emojiPicker } from './lib.js';
import { store, api, arErr } from './sb.js';
import { avatarEl, icon, nameHTML, attachMention, recordAudio, audioPlayer } from './components.js';
import { CONFIG } from './config.js';

export function openComposer({ quote = null, initialText = '', onPosted } = {}) {
  if (!store.me) return;
  let files = [];         // [{file, kind:'image'|'video', previewUrl}]
  let pollOn = false;
  let posting = false;
  let audioRec = null;    // {blob, seconds, previewUrl}

  const ta = el('textarea', {
    class: 'textarea grow',
    placeholder: quote ? 'قول رأيك في البوست ده…' : 'قول حاجة روش… ✦',
    maxlength: CONFIG.postLimit + 50,
  });
  ta.value = initialText;

  /* عداد الحروف */
  const RING_R = 12, CIRC = 2 * Math.PI * RING_R;
  const ring = el('div', { class: 'char-ring' });
  ring.innerHTML = `<svg width="30" height="30" viewBox="0 0 30 30">
    <circle class="bg" cx="15" cy="15" r="${RING_R}"/>
    <circle class="fg" cx="15" cy="15" r="${RING_R}" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/>
  </svg><span class="char-count"></span>`;
  const updateRing = () => {
    const len = ta.value.length;
    const frac = Math.min(1, len / CONFIG.postLimit);
    ring.querySelector('.fg').style.strokeDashoffset = CIRC * (1 - frac);
    ring.classList.toggle('warn', len > CONFIG.postLimit - 50);
    ring.querySelector('.char-count').textContent = len > CONFIG.postLimit - 60 ? (CONFIG.postLimit - len) : '';
    updateSubmit();
  };
  ta.addEventListener('input', updateRing);

  /* معاينات الميديا */
  const previews = el('div', { class: 'compose-previews hidden' });
  const renderPreviews = () => {
    previews.innerHTML = '';
    previews.classList.toggle('hidden', files.length === 0);
    files.forEach((f, i) => {
      const item = el('div', { class: 'cp-item' },
        f.kind === 'video'
          ? el('video', { src: f.previewUrl, muted: true })
          : el('img', { src: f.previewUrl, alt: '' }),
        el('button', { class: 'cp-remove', text: '✕', onclick: () => { URL.revokeObjectURL(f.previewUrl); files.splice(i, 1); renderPreviews(); updateSubmit(); } }),
      );
      previews.append(item);
    });
  };

  /* بلدر الاستطلاع */
  const pollBox = el('div', { class: 'poll-builder hidden' });
  const pollInputs = [];
  const durSel = el('select', { class: 'input', style: { width: 'auto' } },
    el('option', { value: '1', text: 'يوم واحد' }),
    el('option', { value: '3', text: '٣ أيام' }),
    el('option', { value: '7', text: 'أسبوع' }),
    el('option', { value: '0.25', text: '٦ ساعات' }),
  );
  const addPollInput = (ph) => {
    const inp = el('input', { class: 'input', placeholder: ph, maxlength: 60 });
    inp.addEventListener('input', updateSubmit);
    pollInputs.push(inp);
    return inp;
  };
  const rebuildPoll = () => {
    pollBox.innerHTML = '';
    pollInputs.length = 0;
    pollBox.append(
      el('div', { class: 'hstack', style: { justifyContent: 'space-between' } },
        el('span', { class: 'disp-b', text: '📊 استطلاع رأي' }),
        el('button', { class: 'btn btn-sm', text: 'شيل الاستطلاع', onclick: () => togglePoll(false) }),
      ),
      addPollInput('الاختيار الأول'),
      addPollInput('الاختيار التاني'),
    );
    const extra = el('div', { class: 'vstack' });
    const addBtn = el('button', { class: 'btn btn-sm btn-yl', text: '+ اختيار كمان' });
    addBtn.addEventListener('click', () => {
      if (pollInputs.length >= 4) return;
      extra.append(addPollInput(`اختيار ${pollInputs.length + 1}`));
      if (pollInputs.length >= 4) addBtn.classList.add('hidden');
    });
    pollBox.append(extra,
      el('div', { class: 'pb-row' }, addBtn, el('span', { class: 'muted small', text: 'المدة:' }), durSel));
  };
  const togglePoll = (on) => {
    pollOn = on;
    pollBox.classList.toggle('hidden', !on);
    mediaBtn.disabled = on;
    if (on) rebuildPoll();
    updateSubmit();
  };

  /* أزرار الشريط السفلي */
  const mediaBtn = el('button', { class: 'btn btn-ghost btn-icon', html: icon('image'), title: 'صور أو فيديو' });
  mediaBtn.addEventListener('click', async () => {
    if (pollOn) return;
    if (audioRec) { toast('الصوت لوحده من غير ميديا تانية', { emoji: '🎙️' }); return; }
    const hasVideo = files.some((f) => f.kind === 'video');
    if (hasVideo || files.length >= CONFIG.maxImages) { toast('وصلت للحد الأقصى للميديا', { emoji: '🖐️' }); return; }
    const picked = await pickFile('image/*,video/mp4,video/webm,video/quicktime', true);
    if (!picked?.length) return;
    for (const file of picked) {
      const isVideo = /^video\//.test(file.type);
      if (isVideo) {
        if (files.length) { toast('الفيديو لوحده من غير صور', { emoji: '🎬' }); continue; }
        if (file.size > CONFIG.maxVideoMB * 1024 * 1024) { toastErr(`الفيديو أكبر من ${CONFIG.maxVideoMB} ميجا`); continue; }
        files = [{ file, kind: 'video', previewUrl: URL.createObjectURL(file) }];
        break;
      }
      if (files.length >= CONFIG.maxImages) break;
      files.push({ file, kind: 'image', previewUrl: URL.createObjectURL(file) });
    }
    renderPreviews();
    updateSubmit();
  });

  const pollBtn = el('button', { class: 'btn btn-ghost btn-icon', html: icon('poll'), title: 'استطلاع' });
  pollBtn.addEventListener('click', () => {
    if (files.length || audioRec) { toast('الاستطلاع لوحده', { emoji: '📊' }); return; }
    togglePoll(!pollOn);
  });

  /* معاينة الصوت */
  const audioPreview = el('div', { class: 'compose-audio hidden' });
  const renderAudio = () => {
    audioPreview.innerHTML = '';
    audioPreview.classList.toggle('hidden', !audioRec);
    if (!audioRec) return;
    audioPreview.append(
      audioPlayer(audioRec.previewUrl),
      el('button', { class: 'btn btn-sm btn-danger', html: icon('trash') + '<span>شيل</span>', onclick: () => {
        URL.revokeObjectURL(audioRec.previewUrl); audioRec = null; renderAudio(); updateSubmit();
      } }),
    );
  };
  const micBtn = el('button', { class: 'btn btn-ghost btn-icon', html: icon('mic'), title: 'تسجيل صوت' });
  micBtn.addEventListener('click', async () => {
    if (pollOn || files.length) { toast('الصوت لوحده من غير ميديا تانية', { emoji: '🎙️' }); return; }
    const rec = await recordAudio();
    if (!rec) return;
    audioRec = { blob: rec.blob, seconds: rec.seconds, previewUrl: URL.createObjectURL(rec.blob) };
    renderAudio();
    updateSubmit();
  });

  const emojiBtn = el('button', { class: 'btn btn-ghost btn-icon', html: icon('smile'), title: 'إيموجي' });
  emojiBtn.addEventListener('click', () => {
    emojiPicker(emojiBtn, (e) => {
      const s = ta.selectionStart ?? ta.value.length;
      ta.value = ta.value.slice(0, s) + e + ta.value.slice(ta.selectionEnd ?? s);
      ta.dispatchEvent(new Event('input'));
      ta.focus();
    });
  });

  const submitBtn = el('button', { class: 'btn btn-or', html: `<span>انشر ✦</span>` });
  const updateSubmit = () => {
    const hasText = ta.value.trim().length > 0;
    const pollOk = !pollOn || pollInputs.filter((i) => i.value.trim()).length >= 2;
    const pollNeedsText = pollOn && !hasText;
    submitBtn.disabled = posting || ta.value.length > CONFIG.postLimit || (!hasText && !files.length && !audioRec) || !pollOk || pollNeedsText;
  };

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled || posting) return;
    posting = true;
    updateSubmit();
    const veil = el('div', { class: 'upload-veil' },
      el('div', { class: 'led run' }, ...Array.from({ length: 12 }, (_, i) => el('i', { style: { '--i': i } }))),
      el('div', { class: 'uv-txt', text: files.length ? 'بنرفع الميديا…' : 'ثواني…' }),
    );
    m.win.style.position = 'relative';
    m.win.append(veil);
    try {
      const media = [];
      for (const f of files) {
        media.push(f.kind === 'video' ? await api.uploadVideo(f.file) : await api.uploadImage(f.file));
      }
      if (audioRec) media.push(await api.uploadAudio(audioRec.blob, audioRec.seconds));
      let poll = null;
      if (pollOn) {
        const options = pollInputs.map((i) => i.value.trim()).filter(Boolean).slice(0, 4);
        poll = {
          options,
          counts: options.map(() => 0),
          ends_at: new Date(Date.now() + parseFloat(durSel.value) * 86400000).toISOString(),
        };
      }
      const post = await api.createPost({
        content: ta.value.trim(),
        media,
        poll,
        quote_of: quote?.id || null,
      });
      sfx.send();
      toast('اتنشر يا نجم ✦', { emoji: '🚀' });
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      if (audioRec) URL.revokeObjectURL(audioRec.previewUrl);
      m.close();
      store.emit('composed', post);
      onPosted?.(post);
    } catch (err) {
      console.error(err);
      toastErr(arErr(err));
      veil.remove();
      posting = false;
      updateSubmit();
    }
  });

  /* البودي */
  const body = el('div', {},
    el('div', { class: 'composer-row' },
      avatarEl(store.me, 44, { link: false }),
      ta,
    ),
    quote ? el('div', { class: 'quote-card', style: { cursor: 'default' } },
      el('div', { class: 'q-head' },
        avatarEl(quote.author, 28, { link: false }),
        el('span', { class: 'bold small', html: nameHTML(quote.author) }),
      ),
      el('div', { class: 'q-content', text: (quote.content || '🖼️ ميديا').slice(0, 180) }),
    ) : null,
    previews,
    audioPreview,
    pollBox,
    el('div', { class: 'composer-foot' }, mediaBtn, micBtn, pollBtn, emojiBtn, ring, submitBtn),
  );

  const m = modal({ title: quote ? 'اقتباس ✍️' : 'بوست جديد', content: body });
  autoResize(ta);
  attachMention(ta);
  updateRing();
  updateSubmit();
  setTimeout(() => ta.focus(), 80);
  // Ctrl+Enter للنشر
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitBtn.click();
  });
}
