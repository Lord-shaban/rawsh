-- ============================================================
-- روش — RAWSH: نسخة توثيقية من السكيما
-- ⚠️ متطبقة بالفعل على مشروع Supabase (ffocgqzbwjramixpmdbu)
--    عبر 4 migrations: core_schema, logic_triggers_rpcs,
--    security_realtime_storage, lock_down_definer_functions
-- الملف ده للمرجعية ولإعادة البناء لو عملت مشروع جديد.
-- ============================================================

create extension if not exists pg_trgm with schema extensions;

-- ============ الجداول ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name) <= 50),
  bio text not null default '' check (char_length(bio) <= 200),
  avatar_url text,
  cover_url text,
  is_verified boolean not null default false,
  followers_count int not null default 0,
  following_count int not null default 0,
  posts_count int not null default 0,
  streak int not null default 0,
  last_post_on date,
  created_at timestamptz not null default now()
);
create index profiles_username_trgm on public.profiles using gin (username extensions.gin_trgm_ops);
create index profiles_dname_trgm on public.profiles using gin (display_name extensions.gin_trgm_ops);

-- media: [{"type":"image"|"video","url":"...","w":int,"h":int}]
-- poll:  {"options":[...],"counts":[...],"ends_at":"iso"}
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 1000),
  media jsonb not null default '[]'::jsonb,
  poll jsonb,
  quote_of uuid references public.posts(id) on delete set null,
  likes_count int not null default 0,
  comments_count int not null default 0,
  reposts_count int not null default 0,
  views_count int not null default 0,
  created_at timestamptz not null default now()
);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
create index posts_content_trgm on public.posts using gin (content extensions.gin_trgm_ops);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  likes_count int not null default 0,
  replies_count int not null default 0,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_parent_idx on public.comments (parent_id);

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index likes_post_idx on public.likes (post_id);
create index likes_user_idx on public.likes (user_id, created_at desc);

create table public.comment_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
create index comment_likes_comment_idx on public.comment_likes (comment_id);

create table public.reposts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index reposts_post_idx on public.reposts (post_id);
create index reposts_user_idx on public.reposts (user_id, created_at desc);

create table public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

create table public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag text not null check (char_length(tag) <= 60),
  created_at timestamptz not null default now(),
  primary key (post_id, tag)
);
create index post_hashtags_tag_idx on public.post_hashtags (tag, created_at desc);

create table public.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.poll_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_idx int not null check (option_idx >= 0),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null check (media_type in ('image','video','text')),
  media_url text,
  caption text not null default '' check (char_length(caption) <= 200),
  style jsonb,
  views_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index stories_author_idx on public.stories (author_id, created_at desc);
create index stories_expires_idx on public.stories (expires_at);

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user1 uuid not null references public.profiles(id) on delete cascade,
  user2 uuid not null references public.profiles(id) on delete cascade,
  last_message text not null default '',
  last_sender uuid,
  user1_read_at timestamptz not null default now(),
  user2_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user1, user2),
  check (user1 < user2)
);
create index conversations_u1_idx on public.conversations (user1, updated_at desc);
create index conversations_u2_idx on public.conversations (user2, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 2000),
  media_url text,
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages (conversation_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like','comment','reply','comment_like','follow','repost','quote','mention')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ============ التريجرز والدوال ============
-- (كاملة في migrations المشروع — أهم النقاط:)
-- handle_new_user: إنشاء بروفايل من user_metadata عند التسجيل + أول مستخدم is_verified=true
-- fn_notify: إشعار بدون تكرار (dedup على user/actor/type/post/comment)
-- on_post_insert: عدادات + ستريك + استخراج #هاشتاجات (عربي/انجليزي) + @منشنات + إشعار الاقتباس
-- on_comment_insert/delete: عدادات + إشعارات comment/reply + منشنات
-- on_like_change / on_comment_like_change / on_repost_change / on_follow_change: عدادات + إشعارات
-- on_story_view: عداد مشاهدات الستوري
-- on_message_insert: تحديث آخر رسالة + طوابع القراءة
--
-- RPCs:
-- feed_for_you(p_limit,p_offset): ترتيب بـ (لايكات*3+تعليقات*4+ريبوستات*5+مشاهدات*0.05+5)/(العمر+2)^1.35
-- feed_following(p_limit,p_before) / trending_tags(p_limit) / who_to_follow(p_limit)
-- register_views(p_ids uuid[]) / poll_vote(p_post,p_idx) / get_or_create_conversation(p_other)
-- mark_conversation_read(p_conv)
-- كل الدوال security definer بـ set search_path='' والدوال الداخلية مقفولة عن الـ API

-- ============ الأمان ============
-- RLS مفعّل على كل الجداول:
--   قراءة عامة: profiles, posts, comments, likes, comment_likes, reposts, follows, post_hashtags
--   خاص بصاحبه: bookmarks, post_views, poll_votes, notifications
--   stories: القراءة للنشطة فقط (أو صاحبها) / story_views: صاحب الستوري يشوف مين شافها
--   conversations/messages: الأطراف فقط
--   الكتابة دايمًا مقيدة بـ auth.uid()
--
-- Realtime publication: messages, conversations, notifications, posts
--
-- Storage: bucket media (50MB) + avatars (8MB) — عام للقراءة،
--   والرفع/التعديل/المسح للمستخدم جوه فولدر uid بتاعه فقط
