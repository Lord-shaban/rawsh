// روش — الستوريز: شريط الدواير، العارض، الإنشاء (صورة/فيديو/نص)
import { el, esc, timeAgo, modal, toast, toastErr, sfx, pickFile, autoResize, confirmDlg } from './lib.js';
import { store, api, arErr } from './sb.js';
import { avatarEl, icon, emptyState, spinnerRow, userRow, attachMention } from './components.js';

/* ---------- شريط الستوريز ---------- */
export async function renderStoriesBar(mount) {
  mount.innerHTML = '';
  const bar = el('div', { class: 'stories-bar' });
  mount.append(bar);

  /* زرار ستوريك */
  const addBtn = el('button', { class: 'story-bubble' },
    el('div', { class: 'story-ring add', html: icon('plus') }),
    el('span', { class: 'story-name', text: 'ستوريك ✦' }),
  );
  addBtn.addEventListener('click', () => openStoryComposer(() => renderStoriesBar(mount)));
  bar.append(addBtn);

  let groups = [];
  try { groups = await api.activeStories(); } catch (err) { console.error(err); }

  groups.forEach((g, gi) => {
    const b = el('button', { class: 'story-bubble' },
      el('div', { class: 'story-ring' + (g.allSeen ? ' seen' : '') }, avatarEl(g.author, 56, { link: false })),
      el('span', { class: 'story-name', text: g.author?.id === store.me?.id ? 'أنت' : (g.author?.display_name || '') }),
    );
    b.addEventListener('click', () => openStoryViewer(groups, gi, () => renderStoriesBar(mount)));
    bar.append(b);
  });
}

/* ---------- عارض الستوري ---------- */
export function openStoryViewer(groups, groupIdx = 0, onClose) {
  let gi = groupIdx;
  let si = groups[gi].stories.findIndex((s) => !s._seen);
  if (si < 0) si = 0;

  let timer = null;
  let progressStart = 0;
  let progressDur = 6000;
  let paused = false;
  let pausedAt = 0;

  const frame = el('div', { class: 'story-frame' });
  const viewer = el('div', { class: 'story-viewer' }, frame);

  const close = () => {
    clearTimeout(timer);
    viewer.remove();
    document.removeEventListener('keydown', keys);
    onClose?.();
  };

  const keys = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') next();
    if (e.key === 'ArrowRight') prev();
  };
  document.addEventListener('keydown', keys);

  function next() {
    const g = groups[gi];
    if (si < g.stories.length - 1) { si++; render(); }
    else if (gi < groups.length - 1) { gi++; si = 0; render(); }
    else close();
  }
  function prev() {
    if (si > 0) { si--; render(); }
    else if (gi > 0) { gi--; si = groups[gi].stories.length - 1; render(); }
  }

  function schedule(ms) {
    clearTimeout(timer);
    progressDur = ms;
    progressStart = Date.now();
    timer = setTimeout(next, ms);
  }

  function render() {
    clearTimeout(timer);
    const g = groups[gi];
    const s = g.stories[si];
    s._seen = true;
    if (s.author_id !== store.me?.id) api.viewStory(s.id).catch(() => {});

    frame.innerHTML = '';

    /* المحتوى */
    let contentEl;
    if (s.media_type === 'video') {
      contentEl = el('video', { src: s.media_url, autoplay: true, playsinline: true });
      contentEl.addEventListener('loadedmetadata', () => {
        schedule(Math.min((contentEl.duration || 15) * 1000, 30000));
      });
      contentEl.addEventListener('ended', next);
      schedule(30000);
    } else if (s.media_type === 'text') {
      contentEl = el('div', { class: 'story-text-slide ' + (s.style?.bg || 'sbg-g1'), text: s.style?.text || s.caption || '' });
      schedule(6000);
    } else {
      contentEl = el('img', { src: s.media_url, alt: '' });
      schedule(6000);
    }
    frame.append(contentEl);

    /* شرايط التقدم */
    const prog = el('div', { class: 'story-progress' });
    g.stories.forEach((_, i) => {
      const seg = el('i', {}, el('b'));
      if (i < si) seg.querySelector('b').style.width = '100%';
      prog.append(seg);
    });
    frame.append(prog);
    const fill = prog.children[si]?.querySelector('b');
    const tick = () => {
      if (!viewer.isConnected) return;
      if (fill && !paused) {
        const pct = Math.min(100, ((Date.now() - progressStart) / progressDur) * 100);
        fill.style.width = pct + '%';
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    /* الهيدر */
    const head = el('div', { class: 'story-head' },
      avatarEl(g.author, 36, { link: false }),
      el('div', { class: 'grow' },
        el('div', { class: 's-name', text: g.author?.display_name || '' }),
        el('div', { class: 's-time', text: timeAgo(s.created_at) }),
      ),
    );
    if (s.author_id === store.me?.id) {
      head.append(el('button', {
        class: 'btn btn-icon', html: icon('trash'), title: 'امسح الستوري',
        onclick: async (e) => {
          e.stopPropagation();
          paused = true;
          if (await confirmDlg('تمسح الستوري دي؟')) {
            try {
              await api.deleteStory(s.id);
              toast('اتمسحت', { emoji: '🗑️' });
              g.stories.splice(si, 1);
              if (!g.stories.length) { groups.splice(gi, 1); if (!groups.length) return close(); if (gi >= groups.length) gi = groups.length - 1; si = 0; }
              else if (si >= g.stories.length) si = g.stories.length - 1;
              paused = false;
              render();
            } catch (err) { toastErr(arErr(err)); paused = false; }
          } else { paused = false; schedule(progressDur - (pausedAt - progressStart)); }
        },
      }));
    }
    head.append(el('button', { class: 'btn btn-icon', html: icon('x'), title: 'اقفل', onclick: close }));
    frame.append(head);

    /* الكابشن */
    if (s.caption && s.media_type !== 'text') {
      frame.append(el('div', { class: 'story-caption', text: s.caption }));
    }

    /* عداد المشاهدات (ستوريّاتي بس) */
    if (s.author_id === store.me?.id) {
      const vBtn = el('button', { class: 'btn btn-sm btn-yl story-views-chip', text: `👁️ ${s.views_count || 0}` });
      vBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        paused = true; clearTimeout(timer);
        const box = el('div', { class: 'followers-list vstack' }, spinnerRow());
        modal({
          title: 'مين شاف الستوري 👀', content: box,
          onClose: () => { paused = false; schedule(4000); },
        });
        try {
          const viewers = await api.storyViewers(s.id);
          box.innerHTML = '';
          if (!viewers.length) box.append(emptyState('🦗', 'محدش شافها لسه'));
          viewers.forEach((u) => box.append(userRow(u, { withFollow: false, onClick: () => { location.hash = `#/u/${u.username}`; } })));
        } catch { box.innerHTML = ''; }
      });
      frame.append(vBtn);
    }

    /* مناطق التنقل + الإيقاف بالضغط المطول */
    const zoneNext = el('div', { class: 'story-zone next', onclick: next });
    const zonePrev = el('div', { class: 'story-zone prev', onclick: prev });
    for (const z of [zoneNext, zonePrev]) {
      z.addEventListener('pointerdown', () => {
        paused = true; pausedAt = Date.now();
        clearTimeout(timer);
        if (contentEl.pause) contentEl.pause();
      });
      z.addEventListener('pointerup', () => {
        if (!paused) return;
        paused = false;
        const remaining = Math.max(600, progressDur - (pausedAt - progressStart));
        progressStart = Date.now() - (progressDur - remaining);
        timer = setTimeout(next, remaining);
        if (contentEl.play) contentEl.play().catch(() => {});
      });
    }
    frame.append(zoneNext, zonePrev);
  }

  document.body.append(viewer);
  render();
}

/* ---------- إنشاء ستوري ---------- */
export function openStoryComposer(onDone) {
  let mode = 'media';   // media | text
  let file = null;
  let previewUrl = null;
  let bg = 'sbg-g1';
  let posting = false;

  const body = el('div');

  const tabs = el('div', { class: 'tabs', style: { marginBottom: '14px' } },
    el('button', { text: '🖼️ صورة/فيديو', dataset: { m: 'media' }, class: 'active' }),
    el('button', { text: '✍️ نص ملوّن', dataset: { m: 'text' } }),
  );

  const mediaZone = el('div');
  const pickBtn = el('button', {
    class: 'btn btn-yl btn-lg', style: { width: '100%' },
    html: icon('image') + '<span>اختار صورة أو فيديو</span>',
  });
  const previewBox = el('div', { class: 'center hidden', style: { marginTop: '12px' } });
  pickBtn.addEventListener('click', async () => {
    const f = await pickFile('image/*,video/mp4,video/webm,video/quicktime');
    if (!f) return;
    if (/^video\//.test(f.type) && f.size > 45 * 1024 * 1024) { toastErr('الفيديو أكبر من 45 ميجا'); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    file = f;
    previewUrl = URL.createObjectURL(f);
    previewBox.classList.remove('hidden');
    previewBox.innerHTML = '';
    previewBox.append(/^video\//.test(f.type)
      ? el('video', { src: previewUrl, controls: true, style: { maxHeight: '300px', borderRadius: '14px', border: '2.5px solid var(--line)' } })
      : el('img', { src: previewUrl, style: { maxHeight: '300px', borderRadius: '14px', border: '2.5px solid var(--line)' } }));
    updateSubmit();
  });
  const captionInp = el('input', { class: 'input', placeholder: 'كابشن (اختياري)… @ لمنشن حد', maxlength: 200, style: { marginTop: '12px' } });
  attachMention(captionInp);
  mediaZone.append(pickBtn, previewBox, captionInp);

  /* وضع النص */
  const textZone = el('div', { class: 'hidden' });
  const textTa = el('textarea', { class: 'textarea', placeholder: 'اكتب حاجة روش… @ لمنشن حد', maxlength: 200, style: { minHeight: '80px' } });
  attachMention(textTa);
  const textPreview = el('div', {
    class: 'story-text-slide ' + bg,
    style: { height: '260px', borderRadius: '16px', border: '2.5px solid var(--line)', marginTop: '12px' },
  });
  const swatches = el('div', { class: 'hstack', style: { marginTop: '12px', flexWrap: 'wrap' } });
  ['sbg-g1', 'sbg-g2', 'sbg-g3', 'sbg-g4', 'sbg-g5', 'sbg-g6'].forEach((cls) => {
    const sw = el('button', {
      class: cls,
      style: { width: '44px', height: '44px', borderRadius: '13px', border: '2.5px solid var(--line)', cursor: 'pointer', boxShadow: bg === cls ? '-3px 3px 0 var(--sh)' : 'none' },
      onclick: () => {
        bg = cls;
        textPreview.className = 'story-text-slide ' + cls;
        textPreview.style.height = '260px'; textPreview.style.borderRadius = '16px'; textPreview.style.border = '2.5px solid var(--line)'; textPreview.style.marginTop = '12px';
        swatches.querySelectorAll('button').forEach((b) => b.style.boxShadow = 'none');
        sw.style.boxShadow = '-3px 3px 0 var(--sh)';
      },
    });
    swatches.append(sw);
  });
  textTa.addEventListener('input', () => { textPreview.textContent = textTa.value || '…'; updateSubmit(); });
  textPreview.textContent = '…';
  textZone.append(textTa, textPreview, swatches);
  autoResize(textTa);

  const submitBtn = el('button', { class: 'btn btn-or btn-lg', style: { width: '100%', marginTop: '16px' }, text: 'انشر الستوري ✦', disabled: true });
  const updateSubmit = () => {
    submitBtn.disabled = posting || (mode === 'media' ? !file : !textTa.value.trim());
  };

  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-m]');
    if (!b) return;
    mode = b.dataset.m;
    tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    mediaZone.classList.toggle('hidden', mode !== 'media');
    textZone.classList.toggle('hidden', mode !== 'text');
    updateSubmit();
  });

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    posting = true;
    updateSubmit();
    submitBtn.textContent = 'ثواني… 💿';
    try {
      if (mode === 'media') {
        const isVideo = /^video\//.test(file.type);
        const up = isVideo ? await api.uploadVideo(file) : await api.uploadImage(file, { maxW: 1280 });
        await api.createStory({ media_type: up.type, media_url: up.url, caption: captionInp.value.trim() });
      } else {
        await api.createStory({ media_type: 'text', style: { bg, text: textTa.value.trim() } });
      }
      sfx.send();
      toast('الستوري اتنشرت ✦ هتفضل 24 ساعة', { emoji: '🌟' });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      m.close();
      onDone?.();
    } catch (err) {
      console.error(err);
      toastErr(arErr(err));
      posting = false;
      submitBtn.textContent = 'انشر الستوري ✦';
      updateSubmit();
    }
  });

  body.append(tabs, mediaZone, textZone, submitBtn);
  const m = modal({ title: 'ستوري جديدة 🌟', content: body });
}
