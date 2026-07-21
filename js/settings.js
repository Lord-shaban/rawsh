// روش — الإعدادات وتعديل البروفايل
import { el, esc, modal, toast, toastErr, sfx, setSound, soundOn, debounce, pickFile, confirmDlg } from './lib.js';
import { store, api, arErr } from './sb.js';
import { avatarEl, icon } from './components.js';

export function getTheme() { return localStorage.getItem('rawsh_theme') || 'light'; }
export function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('rawsh_theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t === 'dark' ? '#12142e' : '#f3e9d7';
  store.emit('theme', t);
}
export function toggleTheme() {
  applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  sfx.pop();
}

/* ---------- نافذة الإعدادات ---------- */
export function openSettings() {
  const body = el('div');

  const row = (ico, title, sub, ctrl) => el('div', { class: 'settings-row' },
    el('span', { class: 's-ico', text: ico }),
    el('div', { class: 's-info' }, el('div', { class: 's-title', text: title }), el('div', { class: 's-sub', text: sub })),
    ctrl,
  );

  /* الثيم */
  const themeToggle = el('button', { class: 'toggle' + (getTheme() === 'dark' ? ' on' : ''), 'aria-label': 'الوضع الليلي' });
  themeToggle.addEventListener('click', () => { toggleTheme(); themeToggle.classList.toggle('on', getTheme() === 'dark'); });

  /* الصوت */
  const soundToggle = el('button', { class: 'toggle' + (soundOn() ? ' on' : ''), 'aria-label': 'الأصوات' });
  soundToggle.addEventListener('click', () => {
    setSound(!soundOn());
    soundToggle.classList.toggle('on', soundOn());
    if (soundOn()) sfx.pop();
  });

  const editBtn = el('button', { class: 'btn btn-sm btn-or', text: 'عدّل ✏️' });
  editBtn.addEventListener('click', () => { m.close(); openEditProfile(); });

  const aboutBtn = el('button', { class: 'btn btn-sm', text: 'شوف 👀' });
  aboutBtn.addEventListener('click', () => openAbout());

  const logoutBtn = el('button', { class: 'btn btn-sm btn-danger', text: 'اخرج 🚪' });
  logoutBtn.addEventListener('click', async () => {
    if (!(await confirmDlg('هتمشي بجد؟ 🥺', { okText: 'أيوة هخرج', danger: true, title: 'تسجيل خروج' }))) return;
    m.close();
    await api.signOut();
    location.reload();
  });

  body.append(
    row('🎨', 'الوضع الليلي (فضاء)', 'سماء نجوم زي البوسترات', themeToggle),
    row('🔊', 'أصوات روش', 'نغمات ريترو للتفاعلات', soundToggle),
    row('👤', 'بروفايلك', 'الصورة والاسم والبايو', editBtn),
    row('💿', 'عن روش', 'إيه المنصة دي أصلًا؟', aboutBtn),
    row('🚪', 'تسجيل خروج', 'مع السلامة يا نجم', logoutBtn),
  );

  const m = modal({ title: 'الإعدادات ⚙️', content: body });
}

/* ---------- تعديل البروفايل ---------- */
export function openEditProfile(onSaved) {
  const me = store.me;
  let avatarFile = null, coverFile = null;

  /* الكوفر + الأفاتار */
  const coverBox = el('div', { class: 'cover-edit' + (me.cover_url ? '' : ' checker'), text: me.cover_url ? '' : '🖼️ دوس تحط كوفر' });
  if (me.cover_url) coverBox.style.backgroundImage = `url("${me.cover_url}")`;
  coverBox.addEventListener('click', async (e) => {
    if (e.target.closest('.avatar-edit')) return;
    const f = await pickFile('image/*');
    if (!f) return;
    coverFile = f;
    coverBox.textContent = '';
    coverBox.classList.remove('checker');
    coverBox.style.backgroundImage = `url("${URL.createObjectURL(f)}")`;
    coverBox.append(avatarWrap);
  });

  const avatarHolder = avatarEl(me, 96, { link: false });
  const avatarWrap = el('div', { class: 'avatar-edit' }, avatarHolder,
    el('span', { class: 'av-cam', html: icon('camera') }));
  avatarWrap.addEventListener('click', async (e) => {
    e.stopPropagation();
    const f = await pickFile('image/*');
    if (!f) return;
    avatarFile = f;
    avatarHolder.innerHTML = '';
    avatarHolder.style.background = 'none';
    avatarHolder.append(el('img', { src: URL.createObjectURL(f) }));
  });
  coverBox.append(avatarWrap);

  /* الحقول */
  const dname = el('input', { class: 'input', value: me.display_name || '', maxlength: 50, placeholder: 'اسمك الظاهر' });
  const uname = el('input', { class: 'input', value: me.username, maxlength: 20, dir: 'ltr' });
  const unameHint = el('div', { class: 'hint', text: 'لو غيرته، لينك بروفايلك هيتغير' });
  const bio = el('textarea', { class: 'textarea', maxlength: 200, placeholder: 'عرّف الناس بنفسك… (200 حرف)' });
  bio.value = me.bio || '';

  let unameOk = true;
  const checkU = debounce(async () => {
    const v = uname.value.trim().toLowerCase();
    uname.value = v;
    if (v === me.username) { unameOk = true; unameHint.className = 'hint'; unameHint.textContent = 'ده اسمك الحالي'; return; }
    if (!/^[a-z0-9_]{3,20}$/.test(v)) { unameOk = false; unameHint.className = 'hint bad'; unameHint.textContent = 'حروف انجليزي صغيرة وأرقام و _ (3-20)'; return; }
    unameHint.className = 'hint'; unameHint.textContent = '⏳…';
    try {
      const ok = await api.usernameAvailable(v);
      unameOk = ok;
      unameHint.className = 'hint ' + (ok ? 'ok' : 'bad');
      unameHint.textContent = ok ? 'متاح ✓' : 'محجوز 😅';
    } catch { unameHint.textContent = ''; }
  }, 400);
  uname.addEventListener('input', checkU);

  const saveBtn = el('button', { class: 'btn btn-or btn-lg', style: { width: '100%', marginTop: '6px' }, text: 'احفظ التعديلات ✓' });
  saveBtn.addEventListener('click', async () => {
    if (!dname.value.trim()) return toastErr('الاسم مينفعش يبقى فاضي');
    if (!unameOk) return toastErr('اسم المستخدم مش متاح');
    saveBtn.disabled = true; saveBtn.textContent = 'بنحفظ… 💿';
    try {
      const patch = {
        display_name: dname.value.trim(),
        username: uname.value.trim().toLowerCase(),
        bio: bio.value.trim(),
      };
      if (avatarFile) {
        const up = await api.uploadImage(avatarFile, { bucket: 'avatars', maxW: 512 });
        patch.avatar_url = up.url;
      }
      if (coverFile) {
        const up = await api.uploadImage(coverFile, { bucket: 'avatars', maxW: 1600 });
        patch.cover_url = up.url;
      }
      await api.updateProfile(patch);
      sfx.send();
      toast('بروفايلك اتحدث ✦', { emoji: '✨' });
      m.close();
      onSaved?.();
      if (location.hash.startsWith('#/u/')) location.hash = `#/u/${patch.username}`;
    } catch (err) {
      toastErr(arErr(err));
      saveBtn.disabled = false; saveBtn.textContent = 'احفظ التعديلات ✓';
    }
  });

  const body = el('div', {},
    coverBox,
    el('div', { class: 'field' }, el('label', { text: 'الاسم الظاهر' }), dname),
    el('div', { class: 'field' }, el('label', { text: 'اسم المستخدم @' }), uname, unameHint),
    el('div', { class: 'field' }, el('label', { text: 'البايو' }), bio),
    saveBtn,
  );
  const m = modal({ title: 'عدّل بروفايلك ✏️', content: body });
}

/* ---------- عن روش ---------- */
function openAbout() {
  const body = el('div', { style: { textAlign: 'center' } },
    el('div', { class: 't3d', style: { fontSize: '52px', fontFamily: 'var(--f-disp)' }, text: 'روش' }),
    el('p', { class: 'disp-b', style: { marginTop: '14px' }, text: 'مش مهم فيه كام، المهم شكله روش ✦' }),
    el('p', { class: 'muted', style: { fontSize: '14px', lineHeight: '1.9' }, html: `منصة سوشيال مصرية بروح البوب-آرت الريترو 🇪🇬<br>بوستات وستوريز ورسايل لحظية واستطلاعات وترندات —<br>كله شغال بـ Supabase Realtime وبحب.` }),
    el('div', { class: 'auth-badges', style: { marginTop: '14px' } },
      el('span', { class: 'chip yl', text: 'v1.0' }),
      el('span', { class: 'chip pk', text: 'Y2K vibes 🪩' }),
      el('span', { class: 'chip bl', text: '2026 ⚡' }),
    ),
  );
  modal({ title: 'عن روش 💿', content: body });
}
