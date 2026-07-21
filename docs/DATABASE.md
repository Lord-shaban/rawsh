# قاعدة البيانات 🗄️

مرجع كامل لجداول روش والـ Triggers والدوال وسياسات الأمان.

> السكيما الكاملة في [`supabase/schema.sql`](../supabase/schema.sql)

---

## نظرة سريعة

| المجموعة | الجداول |
| --- | --- |
| **الناس** | `profiles`, `follows` |
| **المحتوى** | `posts`, `comments`, `post_hashtags` |
| **التفاعلات** | `likes`, `comment_likes`, `reposts`, `bookmarks`, `poll_votes`, `post_views` |
| **الستوريز** | `stories`, `story_views` |
| **الرسايل** | `conversations`, `messages` |
| **التنبيهات** | `notifications` |

---

## الجداول

### `profiles`
البروفايل بيتعمل **تلقائيًا** لما حد يسجّل، عن طريق trigger على `auth.users`.

| العمود | النوع | ملاحظات |
| --- | --- | --- |
| `id` | uuid | مفتاح أساسي، مربوط بـ `auth.users(id)` |
| `username` | text | فريد، `^[a-z0-9_]{3,20}$` |
| `display_name` | text | ≤ 50 حرف |
| `bio` | text | ≤ 200 حرف |
| `avatar_url` / `cover_url` | text | روابط من Storage |
| `is_verified` | boolean | **أول مستخدم بياخدها تلقائيًا** |
| `followers_count` / `following_count` / `posts_count` | int | بتتحدث بـ Triggers |
| `streak` | int | أيام النشر المتواصلة 🔥 |
| `last_post_on` | date | آخر يوم نشر فيه (لحساب الستريك) |

فهارس `gin_trgm` على `username` و `display_name` للبحث السريع.

### `posts`

| العمود | النوع | ملاحظات |
| --- | --- | --- |
| `content` | text | ≤ 1000 حرف |
| `media` | jsonb | `[{"type":"image"\|"video","url":"…","w":int,"h":int}]` |
| `poll` | jsonb | `{"options":[…],"counts":[…],"ends_at":"iso"}` |
| `quote_of` | uuid | البوست المقتبس (`ON DELETE SET NULL`) |
| `likes_count` / `comments_count` / `reposts_count` / `views_count` | int | كلها بـ Triggers |

### `comments`
مستوى واحد من الردود: `parent_id` بيشاور على تعليق أصلي بس (مش على رد تاني).

### `conversations`
```sql
unique (user1, user2)
check  (user1 < user2)
```
شرط `user1 < user2` بيضمن إن أي اتنين ليهم **صف واحد بس** مهما كان مين اللي بدأ الكلام. الدالة `get_or_create_conversation` بترتّب المعرّفات قبل الإدخال.

`user1_read_at` / `user2_read_at` بتحسب الرسايل غير المقروءة وعلامات "✓✓ شافها".

### `stories`
`expires_at` افتراضيًا `now() + 24 hours`، وسياسة القراءة بتخفي المنتهية تلقائيًا.

النوع `text` بيستخدم `style` = `{"bg":"sbg-g1","text":"…"}` للستوريز النصية الملوّنة.

---

## الـ Triggers — كل المنطق هنا

| التريجر | على | بيعمل إيه |
| --- | --- | --- |
| `on_auth_user_created` | `auth.users` INSERT | يعمل بروفايل من `raw_user_meta_data`، يولّد اسم بديل لو الاسم محجوز، ويدّي أول مستخدم شارة التوثيق |
| `trg_post_insert` | `posts` INSERT | `posts_count++` · حساب الستريك · استخراج **#هاشتاجات** (عربي وإنجليزي) · إشعارات **@منشنات** · عداد وإشعار الاقتباس |
| `trg_post_delete` | `posts` DELETE | ترجيع العدادات |
| `trg_comment_insert` | `comments` INSERT | `comments_count++` · `replies_count++` · إشعار `comment` أو `reply` · منشنات |
| `trg_like_change` | `likes` I/D | `likes_count` ± · إشعار `like` |
| `trg_comment_like_change` | `comment_likes` I/D | عداد لايكات التعليق · إشعار |
| `trg_repost_change` | `reposts` I/D | `reposts_count` ± · إشعار |
| `trg_follow_change` | `follows` I/D | `followers_count` و `following_count` ± · إشعار `follow` |
| `trg_story_view` | `story_views` INSERT | `views_count++` |
| `trg_message_insert` | `messages` INSERT | تحديث `last_message` و `updated_at` وطابع قراءة الراسل |

### `fn_notify()` — منع تكرار الإشعارات
كل الإشعارات بتعدّي على الدالة دي. بتتخطى الإشعار لو:
- المستخدم بيعمل الحاجة لنفسه (`user = actor`)
- فيه إشعار مطابق بالظبط موجود قبل كده (نفس المستخدم + الفاعل + النوع + البوست + التعليق)

يعني لو حد عمل لايك وشال وعمل تاني، مش هيتبعتله إشعار مرتين.

---

## الدوال (RPCs)

### `feed_for_you(p_limit, p_offset)`
ترتيب بخوارزمية تفاعل + حداثة:

```
النقاط = (لايكات×3 + تعليقات×4 + ريبوستات×5 + مشاهدات×0.05 + 5)
         ÷ (العمر بالساعات + 2) ^ 1.35
```

الوزن الأعلى للريبوست لأنه أقوى إشارة اهتمام. الـ `+5` بيدي البوستات الجديدة فرصة تظهر قبل ما تجمع تفاعل.

### `feed_following(p_limit, p_before)`
بوستات اللي بتتابعهم + بوستاتك، بترقيم بالمؤشر (`created_at`).

### `trending_tags(p_limit)`
أكتر الهاشتاجات استخدامًا في **آخر ٤٨ ساعة**.

### `who_to_follow(p_limit)`
أكتر الناس متابعين، ما عدا اللي بتتابعهم ونفسك.

### `poll_vote(p_post, p_idx)` 🔒
بتقفل صف البوست بـ `FOR UPDATE`، تتأكد إن الاستطلاع لسه شغال والاختيار صحيح، تسجّل الصوت، وتزوّد العداد ذريًا. لو صوّت قبل كده بترجّع الاستطلاع من غير تغيير.

### `register_views(p_ids uuid[])` 🔒
بتاخد دفعة معرّفات وتسجّل المشاهدات الجديدة بس (`ON CONFLICT DO NOTHING`) وتزوّد العدادات مرة واحدة.

### `get_or_create_conversation(p_other)` 🔒
بترتّب المعرّفين وتعمل المحادثة لو مش موجودة.

### `mark_conversation_read(p_conv)` 🔒
بتحدّث طابع القراءة بتاعك انت بس في المحادثة.

> 🔒 = `SECURITY DEFINER` ومحجوبة عن `anon` — للمستخدمين المسجّلين بس.
> كل دوال الـ Triggers محجوبة عن `anon` و `authenticated` تمامًا.

---

## الأمان (RLS)

**RLS متفعّل على كل الجداول من غير استثناء.**

### القراءة

| مفتوح للكل | لصاحبه بس | للأطراف بس |
| --- | --- | --- |
| `profiles` | `bookmarks` | `conversations` |
| `posts` | `post_views` | `messages` |
| `comments` | `poll_votes` | |
| `likes` | `notifications` | |
| `comment_likes` | | |
| `reposts` | | |
| `follows` | | |
| `post_hashtags` | | |

**`stories`**: القراءة للستوريز النشطة بس (`expires_at > now()`) أو لصاحبها.
**`story_views`**: صاحب الستوري يشوف مين شافها، والمشاهد يشوف مشاهداته.

### الكتابة

كل سياسات الكتابة مربوطة بـ `auth.uid()`:

```sql
create policy "posts insert own" on public.posts
  for insert with check (author_id = (select auth.uid()));
```

**مفيش سياسة `UPDATE` على `posts` أو `comments` أو `profiles` غير صاحبها** — والعدادات مالهاش سياسة UPDATE أصلًا للمستخدمين، فمستحيل حد يزوّد لايكاته بنفسه.

> `(select auth.uid())` مش `auth.uid()` مباشرة — التغليف ده بيخلي Postgres يقيّمها مرة واحدة بدل كل صف، وبيفرق كتير في الأداء.

---

## التخزين (Storage)

| Bucket | الحد | الاستخدام |
| --- | --- | --- |
| `media` | 50 MB | صور وفيديوهات البوستات والستوريز والرسايل |
| `avatars` | 8 MB | صور البروفايل والكوفر |

الاتنين عامين للقراءة، والرفع مقيّد:

```sql
(storage.foldername(name))[1] = (select auth.uid())::text
```

يعني كل مستخدم يقدر يرفع في فولدر اسمه معرّفه بس — مايقدرش يكتب فوق ملفات حد تاني.

---

## اللحظي (Realtime)

الجداول المنشورة: `messages` · `conversations` · `notifications` · `posts`

RLS بتتطبق على البث كمان — يعني مش هتوصلك رسالة من محادثة مش انت طرف فيها.

---

## تشغيل السكيما على مشروع جديد

1. اعمل مشروع على [supabase.com](https://supabase.com)
2. افتح **SQL Editor** والصق محتوى [`supabase/schema.sql`](../supabase/schema.sql)
3. حدّث `url` و `anonKey` في [`js/config.js`](../js/config.js) من **Settings → API**
4. من **Authentication → Providers → Email** اقفل *Confirm email* (أسهل للتجربة)
5. شغّل `get_advisors` وتأكد إن مفيش تحذيرات أمان

---

## أوامر مفيدة

```sql
-- نظرة على الأحجام
select
  (select count(*) from profiles) as users,
  (select count(*) from posts)    as posts,
  (select count(*) from messages) as messages;

-- تنضيف الستوريز المنتهية (اختياري — السياسات بتخفيها أصلًا)
delete from stories where expires_at < now() - interval '7 days';

-- إعادة حساب العدادات لو حصل أي تضارب
update profiles p set
  followers_count = (select count(*) from follows where following_id = p.id),
  following_count = (select count(*) from follows where follower_id  = p.id),
  posts_count     = (select count(*) from posts   where author_id    = p.id);
```
