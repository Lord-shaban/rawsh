# الرفع والتشغيل ☁️

روش موقع **static بالكامل** — مفيش build ولا سيرفر. أي استضافة بتقدم ملفات هتشغّله.

---

## قبل ما ترفع — خطوتين في Supabase

### ١. التسجيل من غير تأكيد إيميل (اختياري بس مريح)

**Authentication → Sign In / Providers → Email** → اقفل **Confirm email**

> لو سبته مفتوح، التطبيق هيتعامل معاه عادي: هيظهر شاشة "فعّل حسابك من الإيميل" بزرار إعادة إرسال. بس لازم تعمل الخطوة اللي بعدها.

### ٢. اضبط روابط الرجوع

**Authentication → URL Configuration**

| الحقل | القيمة |
| --- | --- |
| **Site URL** | `https://rawsh.pages.dev` (رابط موقعك) |
| **Redirect URLs** | نفس الرابط + `http://localhost:8080` للتطوير |

من غير الخطوة دي، لينكات تأكيد الإيميل واسترجاع الباسورد هترجّع الناس لمكان غلط.

---

## Cloudflare Pages (الموصى بيه)

### الطريقة أ — سحب وإفلات (أسرع حاجة)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. اسحب فولدر المشروع كله (أو اعمله ZIP)
3. سمّي المشروع `rawsh` → **Deploy**

خلاص. الموقع شغال على `https://rawsh.pages.dev` 🎉

### الطريقة ب — ربط بـ GitHub (بيتحدّث لوحده)

1. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. اختار ريبو `rawsh`
3. الإعدادات:

| الحقل | القيمة |
| --- | --- |
| Framework preset | `None` |
| Build command | *(سيبه فاضي)* |
| Build output directory | `/` |
| Root directory | `/` |

4. **Save and Deploy**

بعد كده أي `git push` على `master` بيرفع نسخة جديدة تلقائيًا.

### الطريقة ج — GitHub Actions

الريبو فيه [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) جاهز. عشان يشتغل، ضيف السرّين دول في **Settings → Secrets and variables → Actions**:

| السرّ | تجيبه منين |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create → قالب **Edit Cloudflare Workers** |
| `CLOUDFLARE_ACCOUNT_ID` | من الشريط الجانبي في داشبورد Cloudflare |

من غيرهم، الـ workflow بيتخطى نفسه بهدوء ومابيفشلش.

---

## استضافات تانية

<details>
<summary><b>Vercel</b></summary>

```bash
npm i -g vercel
vercel --prod
```
Framework Preset: **Other** · Build Command: فاضي · Output Directory: `.`
</details>

<details>
<summary><b>Netlify</b></summary>

اسحب الفولدر على [app.netlify.com/drop](https://app.netlify.com/drop) — وخلاص.
ملف [`_headers`](../_headers) و [`_redirects`](../_redirects) بيشتغلوا على Netlify زي Cloudflare بالظبط.
</details>

<details>
<summary><b>GitHub Pages</b></summary>

**Settings → Pages** → Source: `Deploy from a branch` → Branch: `master` / `root`

⚠️ ملف `_headers` مش هيشتغل على GitHub Pages (مالوش دعم لهيدرز مخصصة).
</details>

<details>
<summary><b>أي سيرفر عادي (Nginx / Apache)</b></summary>

انسخ الملفات في `root` بتاع الموقع وخلاص. مفيش أي إعدادات rewrite مطلوبة لأن الراوتنج بالهاش.
</details>

---

## التشغيل المحلي

```bash
npm install     # مرة واحدة بس (لأدوات الفحص)
npm run dev     # http://localhost:8080
```

أو من غير npm خالص:

```bash
npx serve .
python -m http.server 8080
php -S localhost:8080
```

> ⚠️ **لازم سيرفر.** فتح `index.html` مباشرة (`file://`) مش هيشتغل — المشروع بيستخدم ES Modules واللي محتاجة بروتوكول HTTP.

---

## الفحص قبل الرفع

```bash
npm run check           # الـ imports + CSS + الملفات الأساسية + إعدادات Supabase
node scripts/smoke.mjs  # بيفتح الصفحة بمتصفح حقيقي ويتأكد إنها شغالة ووصلت للداتابيز
```

---

## ربط مشروع Supabase بتاعك

لو عايز تشغّل نسختك الخاصة:

1. اعمل مشروع على [supabase.com](https://supabase.com)
2. **SQL Editor** → الصق [`supabase/schema.sql`](../supabase/schema.sql) → Run
3. عدّل [`js/config.js`](../js/config.js):

```js
export const CONFIG = {
  url: 'https://xxxxx.supabase.co',   // Settings → API → Project URL
  anonKey: 'eyJhbGci…',                // Settings → API → anon public
  // …
};
```

4. اعمل الخطوتين اللي فوق (Confirm email + URL Configuration)

> **المفتاح ده عام بطبيعته ومفيش مشكلة يتحط في الكود.** الحماية كلها في RLS. اقرا [SECURITY.md](../SECURITY.md).

---

## مشاكل شائعة

| المشكلة | الحل |
| --- | --- |
| صفحة بيضا ومفيش حاجة | فتحت الملف بـ `file://` — لازم سيرفر |
| `Failed to fetch` في الكونسول | مشروع Supabase نايم — افتح الداشبورد ودوس Restore |
| التسجيل مابيعديش | Confirm email مقفول؟ ولا الإيميل متسجل قبل كده؟ |
| لينك التفعيل بيوديني لمكان غلط | اضبط **Site URL** في Authentication → URL Configuration |
| التعديلات مش بتظهر | السيرفس وركر كاش — اعمل hard refresh (Ctrl+Shift+R) |
| المشروع بينام كل شوية | الخطة المجانية بتوقف المشروع بعد أسبوع خمول — أي زيارة بتصحّيه |

---

## ملاحظات على الخطة المجانية

| المورد | الحد |
| --- | --- |
| قاعدة البيانات | 500 MB |
| التخزين | 1 GB |
| الباندويث | 5 GB / شهر |
| المستخدمين النشطين | 50,000 / شهر |
| الاتصالات اللحظية | 200 متزامن |
| **السكون** | بعد ٧ أيام خمول |

⚠️ **مشروع نايم لأكتر من ٩٠ يوم مايتحيّاش تاني** — لو المشروع مهم، ادخل عليه من وقت للتاني أو رقّي الخطة.
