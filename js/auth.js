// روش — الدخول والتسجيل: هيرو بوستر + ديالوج ويندوز
import { el, esc, toast, toastErr, sfx, debounce, modal } from './lib.js';
import { sb, store, api, arErr } from './sb.js';

export function renderAuth(root, { onAuthed }) {
  root.innerHTML = '';
  let tab = 'login';

  /* ---------- الهيرو ---------- */
  const hero = el('div', { class: 'auth-hero' },
    el('div', { class: 'hero-star s2' }),
    el('div', { class: 'hero-star' }),
    el('div', { class: 'auth-logo', text: 'روش' }),
    el('div', { class: 'auth-tag', text: 'مش مهم فيه كام، المهم شكله روش ✦' }),
    el('div', { class: 'auth-stickers' },
      el('span', { text: '💿' }), el('span', { text: '📟' }), el('span', { text: '🪩' }), el('span', { text: '☎️' }),
    ),
  );

  /* ---------- الكارت ---------- */
  const form = el('div', { class: 'auth-form' });
  const tabs = el('div', { class: 'auth-tabs' },
    el('button', { text: 'دخول 🔑', dataset: { t: 'login' } }),
    el('button', { text: 'حساب جديد ✦', dataset: { t: 'signup' } }),
  );
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-t]');
    if (!b) return;
    tab = b.dataset.t;
    sfx.pop();
    renderForm();
  });

  const card = el('div', { class: 'win auth-card' },
    el('div', { class: 'win-bar' },
      el('div', { class: 'win-dots' }, el('i'), el('i'), el('i')),
      el('div', { class: 'win-title', text: 'Make your choice ▣ اعمل اختيارك' }),
    ),
    tabs, form,
    el('div', { class: 'auth-foot', text: 'بدخولك انت موافق تكون روش وتحترم الناس ✌️' }),
  );

  const side = el('div', { class: 'auth-side' },
    card,
    el('div', { class: 'auth-badges' },
      el('span', { class: 'chip yl', text: 'HTML5' }),
      el('span', { class: 'chip pk', text: 'Supabase ⚡' }),
      el('span', { class: 'chip bl', text: 'Realtime' }),
      el('span', { class: 'chip', text: 'صنع بحب 🇪🇬' }),
    ),
  );

  root.append(el('div', { class: 'auth-wrap' }, hero, side));

  function field(label, inputEl, hintEl = null) {
    const f = el('div', { class: 'field' }, el('label', { text: label }), inputEl);
    if (hintEl) f.append(hintEl);
    return f;
  }

  function renderForm() {
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.t === tab));
    form.innerHTML = '';

    if (tab === 'login') {
      const email = el('input', { class: 'input', type: 'email', placeholder: 'you@example.com', autocomplete: 'email', dir: 'ltr' });
      const pass = el('input', { class: 'input', type: 'password', placeholder: '••••••••', autocomplete: 'current-password', dir: 'ltr' });
      const btn = el('button', { class: 'btn btn-or btn-lg', style: { width: '100%' }, text: 'يلا نروّش ✦' });
      const forgot = el('button', { class: 'btn btn-ghost btn-sm', style: { width: '100%', marginTop: '6px' }, text: 'نسيت الباسورد؟ 🤦' });

      const doLogin = async () => {
        if (!email.value.trim() || !pass.value) return toastErr('اكتب الإيميل والباسورد الأول');
        btn.disabled = true; btn.textContent = 'ثواني… 💿';
        try {
          await api.signIn({ email: email.value.trim(), password: pass.value });
          sfx.send();
          onAuthed();
        } catch (err) {
          toastErr(arErr(err));
          if (/Email not confirmed/i.test(String(err?.message))) showVerifyScreen(email.value.trim());
          btn.disabled = false; btn.textContent = 'يلا نروّش ✦';
        }
      };
      btn.addEventListener('click', doLogin);
      pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

      forgot.addEventListener('click', async () => {
        if (!email.value.trim()) return toastErr('اكتب إيميلك فوق الأول');
        try {
          await api.resetPassword(email.value.trim());
          toast('بعتنالك لينك تغيير الباسورد 📬', { emoji: '📬' });
        } catch (err) { toastErr(arErr(err)); }
      });

      form.append(field('الإيميل', email), field('الباسورد', pass), btn, forgot);
    } else {
      const uname = el('input', { class: 'input', placeholder: 'rawsh_hero', autocomplete: 'username', dir: 'ltr', maxlength: 20 });
      const unameHint = el('div', { class: 'hint', text: 'حروف انجليزي صغيرة وأرقام و _ (من 3 لـ 20)' });
      const dname = el('input', { class: 'input', placeholder: 'اسمك اللي هيظهر للناس', maxlength: 50 });
      const email = el('input', { class: 'input', type: 'email', placeholder: 'you@example.com', autocomplete: 'email', dir: 'ltr' });
      const pass = el('input', { class: 'input', type: 'password', placeholder: '8 حروف على الأقل', autocomplete: 'new-password', dir: 'ltr' });
      const btn = el('button', { class: 'btn btn-pk btn-lg', style: { width: '100%' }, text: 'اعمل الحساب ✦' });

      let unameOk = false;
      const checkUname = debounce(async () => {
        const v = uname.value.trim().toLowerCase();
        uname.value = v;
        if (!/^[a-z0-9_]{3,20}$/.test(v)) {
          unameOk = false;
          unameHint.className = 'hint bad';
          unameHint.textContent = v ? 'حروف انجليزي صغيرة وأرقام و _ بس (3-20)' : 'حروف انجليزي صغيرة وأرقام و _ (من 3 لـ 20)';
          return;
        }
        unameHint.className = 'hint';
        unameHint.textContent = 'بنشوف متاح ولا لأ… ⏳';
        try {
          const ok = await api.usernameAvailable(v);
          unameOk = ok;
          unameHint.className = 'hint ' + (ok ? 'ok' : 'bad');
          unameHint.textContent = ok ? `متاح ✓ — هتكون @${v}` : 'محجوز 😅 جرب اسم تاني';
        } catch { unameHint.textContent = ''; }
      }, 400);
      uname.addEventListener('input', checkUname);

      btn.addEventListener('click', async () => {
        const u = uname.value.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,20}$/.test(u)) return toastErr('اسم المستخدم مش مظبوط');
        if (!unameOk) return toastErr('اسم المستخدم محجوز أو لسه بيتفحص');
        if (!dname.value.trim()) return toastErr('اكتب اسمك اللي هيظهر');
        if (!email.value.trim()) return toastErr('اكتب الإيميل');
        if (pass.value.length < 8) return toastErr('الباسورد لازم 8 حروف على الأقل');
        btn.disabled = true; btn.textContent = 'بنجهز حسابك… 💿';
        try {
          const data = await api.signUp({
            email: email.value.trim(), password: pass.value,
            username: u, displayName: dname.value.trim(),
          });
          if (data.session) {
            sfx.send();
            toast('أهلًا بيك في روش ✦', { emoji: '🎉' });
            onAuthed();
          } else {
            showVerifyScreen(email.value.trim());
          }
        } catch (err) {
          toastErr(arErr(err));
          btn.disabled = false; btn.textContent = 'اعمل الحساب ✦';
        }
      });

      form.append(
        field('اسم المستخدم @', uname, unameHint),
        field('الاسم الظاهر', dname),
        field('الإيميل', email),
        field('الباسورد', pass),
        btn,
      );
    }
  }

  function showVerifyScreen(email) {
    form.innerHTML = '';
    form.append(
      el('div', { class: 'center', style: { padding: '10px 0 18px', textAlign: 'center' } },
        el('div', { style: { fontSize: '54px' }, text: '📬' }),
        el('div', { class: 'disp-b', style: { fontSize: '19px', marginTop: '8px' }, text: 'فعّل حسابك من الإيميل' }),
        el('p', { class: 'muted', style: { margin: '8px 0 0' }, html: `بعتنالك لينك تفعيل على <b dir="ltr">${esc(email)}</b><br>دوس عليه وارجع هنا وادخل عادي` }),
      ),
      el('button', {
        class: 'btn btn-yl', style: { width: '100%' }, text: 'ابعتلي اللينك تاني 🔁',
        onclick: async (e) => {
          e.target.disabled = true;
          try { await api.resendConfirm(email); toast('اتبعت تاني ✓', { emoji: '📮' }); }
          catch (err) { toastErr(arErr(err)); }
          setTimeout(() => { e.target.disabled = false; }, 15000);
        },
      }),
      el('button', { class: 'btn btn-ghost', style: { width: '100%', marginTop: '8px' }, text: '← ارجع للدخول', onclick: () => { tab = 'login'; renderForm(); } }),
    );
  }

  renderForm();
}

/* ---------- شاشة تغيير الباسورد (بعد لينك الاسترجاع) ---------- */
export function openPasswordRecovery() {
  const pass = el('input', { class: 'input', type: 'password', placeholder: 'الباسورد الجديد (8+ حروف)', dir: 'ltr' });
  const btn = el('button', { class: 'btn btn-or', style: { width: '100%', marginTop: '12px' }, text: 'غيّر الباسورد ✓' });
  const m = modal({ title: 'باسورد جديد 🔐', content: el('div', {}, pass, btn) });
  btn.addEventListener('click', async () => {
    if (pass.value.length < 8) return toastErr('8 حروف على الأقل');
    btn.disabled = true;
    try {
      await api.updatePassword(pass.value);
      toast('الباسورد اتغير ✓', { emoji: '🔐' });
      m.close();
    } catch (err) { toastErr(arErr(err)); btn.disabled = false; }
  });
}
