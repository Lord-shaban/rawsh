// روش — طبقة البيانات: Supabase client + API + Realtime
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';
import { compressImage, toast, sfx } from './lib.js';

export const sb = createClient(CONFIG.url, CONFIG.anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/* ---------- الستور العام ---------- */
export const store = {
  session: null,
  me: null,                    // صف البروفايل بتاعي
  followingIds: new Set(),     // مين أنا متابعه
  online: new Set(),           // مين أونلاين دلوقتي
  convs: new Map(),            // كاش المحادثات
  unreadNotifs: 0,
  unreadDMs: 0,
  viewedSession: new Set(),    // بوستات اتسجلت مشاهدتها في الجلسة دي
  _ls: {},
  on(ev, fn) {
    (this._ls[ev] ??= new Set()).add(fn);
    return () => this._ls[ev]?.delete(fn);
  },
  emit(ev, data) { this._ls[ev]?.forEach((f) => { try { f(data); } catch (e) { console.error(e); } }); },
};

/* ---------- هيلبر: نفّذ ورمي الخطأ ---------- */
async function q(builder) {
  const { data, error } = await builder;
  if (error) throw error;
  return data;
}

export function arErr(e) {
  const m = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(m)) return 'الإيميل أو الباسورد غلط 🤔';
  if (/Email not confirmed/i.test(m)) return 'لسه مفعلتش حسابك — بص على الإيميل 📬';
  if (/already registered|already been registered/i.test(m)) return 'الإيميل ده متسجل قبل كده — جرب تدخل';
  if (/rate limit|too many/i.test(m)) return 'استنى شوية… محاولات كتير ورا بعض ⏳';
  if (/duplicate key.*username|profiles_username_key/i.test(m)) return 'اسم المستخدم ده محجوز 😅';
  if (/password.*(at least|short)/i.test(m)) return 'الباسورد قصير — 8 حروف على الأقل';
  if (/Failed to fetch|network|TypeError/i.test(m)) return 'النت فصل؟ جرب تاني 📡';
  if (/violates row-level security/i.test(m)) return 'مش مسموح بالعملية دي 🚫';
  return 'حصلت مشكلة… جرب تاني 💥';
}

/* ---------- كاش البروفايلات ---------- */
export const PROFILE_COLS = 'id,username,display_name,bio,avatar_url,cover_url,is_verified,followers_count,following_count,posts_count,streak,created_at';
const profileCache = new Map();

export function cacheProfile(p) { if (p?.id) profileCache.set(p.id, { ...profileCache.get(p.id), ...p }); return profileCache.get(p.id); }
export function cachedProfile(id) { return profileCache.get(id); }

export async function profilesByIds(ids) {
  const need = [...new Set(ids)].filter((id) => id && !profileCache.has(id));
  if (need.length) {
    const rows = await q(sb.from('profiles').select(PROFILE_COLS).in('id', need));
    rows.forEach(cacheProfile);
  }
  const map = new Map();
  for (const id of ids) if (profileCache.has(id)) map.set(id, profileCache.get(id));
  return map;
}

/* ---------- تجميع البوستات (مؤلف + اقتباس + فلاجز) ---------- */
async function assemblePosts(rows) {
  rows = (rows || []).filter(Boolean);
  if (!rows.length) return rows;

  const quoteIds = [...new Set(rows.map((p) => p.quote_of).filter(Boolean))].filter(
    (id) => !rows.some((p) => p.id === id)
  );
  let quotes = [];
  if (quoteIds.length) {
    quotes = await q(sb.from('posts').select('*').in('id', quoteIds)).catch(() => []);
  }
  const quoteMap = new Map(quotes.map((p) => [p.id, p]));
  for (const p of rows) if (p.quote_of && !quoteMap.has(p.quote_of)) {
    const inline = rows.find((r) => r.id === p.quote_of);
    if (inline) quoteMap.set(inline.id, inline);
  }

  const authorIds = [
    ...rows.map((p) => p.author_id),
    ...[...quoteMap.values()].map((p) => p.author_id),
  ];
  const profs = await profilesByIds(authorIds);

  for (const p of rows) {
    p.author = profs.get(p.author_id) || { id: p.author_id, username: 'user', display_name: 'مستخدم' };
    if (p.quote_of) {
      const qp = quoteMap.get(p.quote_of);
      if (qp) { qp.author = profs.get(qp.author_id) || null; p.quote = qp; }
    }
  }

  await hydrateFlags(rows);
  return rows;
}

async function hydrateFlags(rows) {
  if (!store.me || !rows.length) return rows;
  const ids = rows.map((p) => p.id);
  const uid = store.me.id;
  const [likes, reposts, bms, votes] = await Promise.all([
    q(sb.from('likes').select('post_id').eq('user_id', uid).in('post_id', ids)).catch(() => []),
    q(sb.from('reposts').select('post_id').eq('user_id', uid).in('post_id', ids)).catch(() => []),
    q(sb.from('bookmarks').select('post_id').eq('user_id', uid).in('post_id', ids)).catch(() => []),
    q(sb.from('poll_votes').select('post_id,option_idx').eq('user_id', uid).in('post_id', ids)).catch(() => []),
  ]);
  const L = new Set(likes.map((x) => x.post_id));
  const R = new Set(reposts.map((x) => x.post_id));
  const B = new Set(bms.map((x) => x.post_id));
  const V = new Map(votes.map((x) => [x.post_id, x.option_idx]));
  for (const p of rows) {
    p._liked = L.has(p.id);
    p._reposted = R.has(p.id);
    p._bookmarked = B.has(p.id);
    p._myVote = V.has(p.id) ? V.get(p.id) : null;
  }
  return rows;
}

/* ============================================================
   API
   ============================================================ */
export const api = {
  /* ---------- auth ---------- */
  async signUp({ email, password, username, displayName }) {
    const data = await q(sb.auth.signUp({
      email, password,
      options: {
        data: { username: username.toLowerCase(), display_name: displayName },
        emailRedirectTo: location.origin + location.pathname,
      },
    }));
    // الإيميل بيتأكد تلقائيًا في الداتابيز — ادخل مباشرة من غير انتظار تأكيد
    if (!data.session) {
      try {
        const signIn = await sb.auth.signInWithPassword({ email, password });
        if (signIn.session) return signIn;
      } catch {}
    }
    return data;
  },
  signIn({ email, password }) { return q(sb.auth.signInWithPassword({ email, password })); },
  resendConfirm(email) { return q(sb.auth.resend({ type: 'signup', email })); },
  resetPassword(email) { return q(sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); },
  updatePassword(password) { return q(sb.auth.updateUser({ password })); },
  async signOut() { stopRealtime(); await sb.auth.signOut(); },

  async usernameAvailable(username) {
    const rows = await q(sb.from('profiles').select('id').eq('username', username.toLowerCase()).limit(1));
    return rows.length === 0;
  },

  async loadMe(userId) {
    let me = await q(sb.from('profiles').select(PROFILE_COLS).eq('id', userId).maybeSingle());
    if (!me) {
      // احتياطي لو التريجر متعملش — أنشئ البروفايل يدوي
      const meta = store.session?.user?.user_metadata || {};
      let uname = String(meta.username || '').toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(uname)) uname = 'user_' + userId.replace(/-/g, '').slice(0, 8);
      me = await q(sb.from('profiles').insert({
        id: userId,
        username: uname,
        display_name: (meta.display_name || uname).slice(0, 50),
      }).select(PROFILE_COLS).single()).catch(async () => {
        return q(sb.from('profiles').select(PROFILE_COLS).eq('id', userId).single());
      });
    }
    store.me = me;
    cacheProfile(me);
    return me;
  },

  async loadFollowing() {
    if (!store.me) return;
    const rows = await q(sb.from('follows').select('following_id').eq('follower_id', store.me.id).limit(2000)).catch(() => []);
    store.followingIds = new Set(rows.map((r) => r.following_id));
  },

  /* ---------- feeds ---------- */
  async feedForYou(offset = 0, limit = CONFIG.pageSize) {
    const rows = await q(sb.rpc('feed_for_you', { p_limit: limit, p_offset: offset }));
    return assemblePosts(rows);
  },
  async feedFollowing(before = null, limit = CONFIG.pageSize) {
    const rows = await q(sb.rpc('feed_following', { p_limit: limit, p_before: before }));
    return assemblePosts(rows);
  },
  async repostsBy(userIds, before = null, limit = CONFIG.pageSize) {
    if (!userIds?.length) return [];
    let b = sb.from('reposts')
      .select('created_at,user_id,post_id')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (before) b = b.lt('created_at', before);
    const rows = await q(b);
    if (!rows.length) return [];
    const posts = await q(sb.from('posts').select('*').in('id', [...new Set(rows.map((r) => r.post_id))]));
    const postMap = new Map(posts.map((p) => [p.id, p]));
    await assemblePosts(posts);
    const users = await profilesByIds(rows.map((r) => r.user_id));
    return rows
      .filter((r) => postMap.has(r.post_id))
      .map((r) => ({ repost: true, reposted_at: r.created_at, reposter: users.get(r.user_id), post: postMap.get(r.post_id) }));
  },

  /* ---------- posts ---------- */
  async createPost({ content = '', media = [], poll = null, quote_of = null }) {
    const row = await q(sb.from('posts').insert({
      author_id: store.me.id,
      content, media, poll, quote_of,
    }).select('*').single());
    const [p] = await assemblePosts([row]);
    return p;
  },
  deletePost(id) { return q(sb.from('posts').delete().eq('id', id)); },
  async getPost(id) {
    const row = await q(sb.from('posts').select('*').eq('id', id).maybeSingle());
    if (!row) return null;
    const [p] = await assemblePosts([row]);
    return p;
  },
  async postsByAuthor(authorId, before = null, { mediaOnly = false } = {}) {
    let b = sb.from('posts').select('*').eq('author_id', authorId)
      .order('created_at', { ascending: false }).limit(CONFIG.pageSize);
    if (before) b = b.lt('created_at', before);
    if (mediaOnly) b = b.neq('media', '[]');
    return assemblePosts(await q(b));
  },
  async likedPosts(userId, before = null) {
    let b = sb.from('likes').select('created_at,post_id').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(CONFIG.pageSize);
    if (before) b = b.lt('created_at', before);
    const rows = await q(b);
    if (!rows.length) return { items: [], cursor: null };
    const posts = await q(sb.from('posts').select('*').in('id', rows.map((r) => r.post_id)));
    const map = new Map(posts.map((p) => [p.id, p]));
    await assemblePosts(posts);
    return {
      items: rows.filter((r) => map.has(r.post_id)).map((r) => map.get(r.post_id)),
      cursor: rows.length >= CONFIG.pageSize ? rows[rows.length - 1].created_at : null,
    };
  },
  async bookmarkedPosts(before = null) {
    let b = sb.from('bookmarks').select('created_at,post_id').eq('user_id', store.me.id)
      .order('created_at', { ascending: false }).limit(CONFIG.pageSize);
    if (before) b = b.lt('created_at', before);
    const rows = await q(b);
    if (!rows.length) return { items: [], cursor: null };
    const posts = await q(sb.from('posts').select('*').in('id', rows.map((r) => r.post_id)));
    const map = new Map(posts.map((p) => [p.id, p]));
    await assemblePosts(posts);
    return {
      items: rows.filter((r) => map.has(r.post_id)).map((r) => map.get(r.post_id)),
      cursor: rows.length >= CONFIG.pageSize ? rows[rows.length - 1].created_at : null,
    };
  },
  async searchPosts(qs) {
    const safe = qs.replace(/[%_\\]/g, '\\$&');
    const rows = await q(sb.from('posts').select('*').ilike('content', `%${safe}%`)
      .order('created_at', { ascending: false }).limit(30));
    return assemblePosts(rows);
  },
  async tagPosts(tag, before = null) {
    let b = sb.from('post_hashtags').select('created_at,post_id').eq('tag', tag.toLowerCase())
      .order('created_at', { ascending: false }).limit(CONFIG.pageSize);
    if (before) b = b.lt('created_at', before);
    const rows = await q(b);
    if (!rows.length) return { items: [], cursor: null };
    const posts = await q(sb.from('posts').select('*').in('id', rows.map((r) => r.post_id)));
    const map = new Map(posts.map((p) => [p.id, p]));
    await assemblePosts(posts);
    return {
      items: rows.filter((r) => map.has(r.post_id)).map((r) => map.get(r.post_id)),
      cursor: rows.length >= CONFIG.pageSize ? rows[rows.length - 1].created_at : null,
    };
  },

  /* ---------- تفاعلات ---------- */
  like(postId) { return q(sb.from('likes').insert({ user_id: store.me.id, post_id: postId })); },
  unlike(postId) { return q(sb.from('likes').delete().match({ user_id: store.me.id, post_id: postId })); },
  repost(postId) { return q(sb.from('reposts').insert({ user_id: store.me.id, post_id: postId })); },
  unrepost(postId) { return q(sb.from('reposts').delete().match({ user_id: store.me.id, post_id: postId })); },
  bookmark(postId) { return q(sb.from('bookmarks').insert({ user_id: store.me.id, post_id: postId })); },
  unbookmark(postId) { return q(sb.from('bookmarks').delete().match({ user_id: store.me.id, post_id: postId })); },
  pollVote(postId, idx) { return q(sb.rpc('poll_vote', { p_post: postId, p_idx: idx })); },

  queueView(postId) {
    if (!postId || store.viewedSession.has(postId)) return;
    store.viewedSession.add(postId);
    viewQueue.add(postId);
  },

  /* ---------- تعليقات ---------- */
  async comments(postId) {
    const rows = await q(sb.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }).limit(400));
    const profs = await profilesByIds(rows.map((c) => c.author_id));
    for (const c of rows) c.author = profs.get(c.author_id) || { username: 'user', display_name: 'مستخدم' };
    if (store.me && rows.length) {
      const liked = await q(sb.from('comment_likes').select('comment_id').eq('user_id', store.me.id)
        .in('comment_id', rows.map((c) => c.id))).catch(() => []);
      const S = new Set(liked.map((x) => x.comment_id));
      for (const c of rows) c._liked = S.has(c.id);
    }
    return rows;
  },
  async addComment(postId, content, { parentId = null, audioUrl = null } = {}) {
    const row = await q(sb.from('comments').insert({
      post_id: postId, author_id: store.me.id,
      content: (content || '').trim(),
      parent_id: parentId, audio_url: audioUrl,
    }).select('*').single());
    row.author = store.me;
    return row;
  },
  deleteComment(id) { return q(sb.from('comments').delete().eq('id', id)); },
  likeComment(id) { return q(sb.from('comment_likes').insert({ user_id: store.me.id, comment_id: id })); },
  unlikeComment(id) { return q(sb.from('comment_likes').delete().match({ user_id: store.me.id, comment_id: id })); },

  /* ---------- بروفايلات ومتابعة ---------- */
  async profileByUsername(username) {
    const p = await q(sb.from('profiles').select(PROFILE_COLS).eq('username', String(username).toLowerCase()).maybeSingle());
    if (p) cacheProfile(p);
    return p;
  },
  async updateProfile(patch) {
    const p = await q(sb.from('profiles').update(patch).eq('id', store.me.id).select(PROFILE_COLS).single());
    store.me = p;
    cacheProfile(p);
    store.emit('me', p);
    return p;
  },
  async follow(id) {
    await q(sb.from('follows').insert({ follower_id: store.me.id, following_id: id }));
    store.followingIds.add(id);
    const c = cachedProfile(id); if (c) c.followers_count = (c.followers_count || 0) + 1;
    if (store.me) store.me.following_count++;
    store.emit('follow', { id, on: true });
  },
  async unfollow(id) {
    await q(sb.from('follows').delete().match({ follower_id: store.me.id, following_id: id }));
    store.followingIds.delete(id);
    const c = cachedProfile(id); if (c) c.followers_count = Math.max(0, (c.followers_count || 1) - 1);
    if (store.me) store.me.following_count = Math.max(0, store.me.following_count - 1);
    store.emit('follow', { id, on: false });
  },
  async followersOf(id) {
    const rows = await q(sb.from('follows').select('follower_id').eq('following_id', id).order('created_at', { ascending: false }).limit(100));
    const profs = await profilesByIds(rows.map((r) => r.follower_id));
    return rows.map((r) => profs.get(r.follower_id)).filter(Boolean);
  },
  async followingOf(id) {
    const rows = await q(sb.from('follows').select('following_id').eq('follower_id', id).order('created_at', { ascending: false }).limit(100));
    const profs = await profilesByIds(rows.map((r) => r.following_id));
    return rows.map((r) => profs.get(r.following_id)).filter(Boolean);
  },
  async searchUsers(qs) {
    const safe = qs.replace(/[%_\\]/g, '\\$&').replace(/[,()]/g, ' ').trim();
    if (!safe) return [];
    const rows = await q(sb.from('profiles').select(PROFILE_COLS)
      .or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`)
      .order('followers_count', { ascending: false }).limit(20));
    rows.forEach(cacheProfile);
    return rows;
  },
  async whoToFollow(limit = 5) {
    const rows = await q(sb.rpc('who_to_follow', { p_limit: limit }));
    rows.forEach(cacheProfile);
    return rows;
  },
  trendingTags(limit = 8) { return q(sb.rpc('trending_tags', { p_limit: limit })); },
  async searchTags(qs) {
    const safe = qs.replace(/[%_\\]/g, '\\$&');
    const rows = await q(sb.from('post_hashtags').select('tag').ilike('tag', `%${safe}%`).limit(120));
    const counts = new Map();
    for (const r of rows) counts.set(r.tag, (counts.get(r.tag) || 0) + 1);
    return [...counts.entries()].map(([tag, uses]) => ({ tag, uses })).sort((a, b) => b.uses - a.uses).slice(0, 12);
  },

  /* ---------- ستوريز ---------- */
  async activeStories() {
    const rows = await q(sb.from('stories').select('*').gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true }).limit(300));
    const profs = await profilesByIds(rows.map((s) => s.author_id));
    for (const s of rows) s.author = profs.get(s.author_id);
    let seen = new Set();
    if (store.me && rows.length) {
      const v = await q(sb.from('story_views').select('story_id').eq('viewer_id', store.me.id)
        .in('story_id', rows.map((s) => s.id))).catch(() => []);
      seen = new Set(v.map((x) => x.story_id));
    }
    for (const s of rows) s._seen = seen.has(s.id);
    // جروبينج حسب صاحب الستوري
    const groups = new Map();
    for (const s of rows) {
      if (!groups.has(s.author_id)) groups.set(s.author_id, { author: s.author, stories: [], allSeen: true });
      const g = groups.get(s.author_id);
      g.stories.push(s);
      if (!s._seen) g.allSeen = false;
    }
    const arr = [...groups.values()];
    arr.sort((a, b) => {
      if (a.author?.id === store.me?.id) return -1;
      if (b.author?.id === store.me?.id) return 1;
      if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
      return 0;
    });
    return arr;
  },
  createStory({ media_type, media_url = null, caption = '', style = null }) {
    return q(sb.from('stories').insert({
      author_id: store.me.id, media_type, media_url, caption, style,
    }).select('*').single());
  },
  deleteStory(id) { return q(sb.from('stories').delete().eq('id', id)); },
  viewStory(id) {
    return sb.from('story_views').insert({ story_id: id, viewer_id: store.me.id }).then(() => {});
  },
  async storyViewers(id) {
    const rows = await q(sb.from('story_views').select('viewer_id,created_at').eq('story_id', id)
      .order('created_at', { ascending: false }).limit(200));
    const profs = await profilesByIds(rows.map((r) => r.viewer_id));
    return rows.map((r) => profs.get(r.viewer_id)).filter(Boolean);
  },

  /* ---------- رسايل ---------- */
  async conversations() {
    const rows = await q(sb.from('conversations').select('*')
      .or(`user1.eq.${store.me.id},user2.eq.${store.me.id}`)
      .order('updated_at', { ascending: false }).limit(100));
    await profilesByIds(rows.map((c) => (c.user1 === store.me.id ? c.user2 : c.user1)));
    rows.forEach((c) => store.convs.set(c.id, c));
    recalcDMBadge();
    return rows;
  },
  async openConversation(otherId) {
    const conv = await q(sb.rpc('get_or_create_conversation', { p_other: otherId }));
    const row = Array.isArray(conv) ? conv[0] : conv;
    store.convs.set(row.id, row);
    await profilesByIds([row.user1, row.user2]);
    return row;
  },
  async messages(convId, before = null) {
    let b = sb.from('messages').select('*').eq('conversation_id', convId)
      .order('created_at', { ascending: false }).limit(30);
    if (before) b = b.lt('created_at', before);
    const rows = await q(b);
    return rows.reverse();
  },
  sendMessage(convId, content, media_url = null, reply_to = null) {
    return q(sb.from('messages').insert({
      conversation_id: convId, sender_id: store.me.id, content, media_url, reply_to,
    }).select('*').single());
  },
  editMessage(id, content) { return q(sb.rpc('edit_message', { p_msg: id, p_content: content })); },
  toggleReaction(id, emoji) { return q(sb.rpc('toggle_reaction', { p_msg: id, p_emoji: emoji })); },
  deleteMessage(id) { return q(sb.from('messages').delete().eq('id', id)); },
  async markConvRead(convId) {
    const c = store.convs.get(convId);
    if (c) {
      if (c.user1 === store.me.id) c.user1_read_at = new Date().toISOString();
      else c.user2_read_at = new Date().toISOString();
      recalcDMBadge();
    }
    await sb.rpc('mark_conversation_read', { p_conv: convId });
  },

  /* ---------- إشعارات ---------- */
  async notifications(before = null) {
    let b = sb.from('notifications').select('*').eq('user_id', store.me.id)
      .order('created_at', { ascending: false }).limit(30);
    if (before) b = b.lt('created_at', before);
    const rows = await q(b);
    const profs = await profilesByIds(rows.map((n) => n.actor_id));
    for (const n of rows) n.actor = profs.get(n.actor_id);
    const postIds = [...new Set(rows.map((n) => n.post_id).filter(Boolean))];
    if (postIds.length) {
      const posts = await q(sb.from('posts').select('id,content,media').in('id', postIds)).catch(() => []);
      const pm = new Map(posts.map((p) => [p.id, p]));
      for (const n of rows) if (n.post_id) n.post = pm.get(n.post_id);
    }
    return rows;
  },
  async refreshNotifBadge() {
    const { count, error } = await sb.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', store.me.id).eq('is_read', false);
    if (!error) { store.unreadNotifs = count || 0; store.emit('badges'); }
  },
  async markAllNotifsRead() {
    await sb.from('notifications').update({ is_read: true }).eq('user_id', store.me.id).eq('is_read', false);
    store.unreadNotifs = 0;
    store.emit('badges');
  },

  /* ---------- رفع ملفات ---------- */
  async uploadBlob(bucket, blob, ext, contentType) {
    const path = `${store.me.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await q(sb.storage.from(bucket).upload(path, blob, { contentType, cacheControl: '31536000', upsert: false }));
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },
  async uploadImage(file, { bucket = 'media', maxW = 1600 } = {}) {
    const { blob, w, h, type, ext } = await compressImage(file, maxW);
    const url = await this.uploadBlob(bucket, blob, ext, type);
    return { type: 'image', url, w, h };
  },
  async uploadVideo(file) {
    if (file.size > CONFIG.maxVideoMB * 1024 * 1024) throw new Error(`الفيديو أكبر من ${CONFIG.maxVideoMB} ميجا`);
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const url = await this.uploadBlob('media', file, ext, file.type || 'video/mp4');
    return { type: 'video', url };
  },
  async uploadAudio(blob, seconds = 0) {
    const t = blob.type || 'audio/webm';
    const ext = /mp4|m4a|aac/.test(t) ? 'm4a' : /ogg/.test(t) ? 'ogg' : 'webm';
    const url = await this.uploadBlob('media', blob, ext, t);
    return { type: 'audio', url, dur: Math.round(seconds) };
  },
};

/* ---------- طابور المشاهدات ---------- */
const viewQueue = new Set();
let viewTimer = null;
function startViewFlusher() {
  stopViewFlusher();
  viewTimer = setInterval(async () => {
    if (!viewQueue.size || !store.me) return;
    const ids = [...viewQueue].slice(0, 50);
    ids.forEach((id) => viewQueue.delete(id));
    try { await sb.rpc('register_views', { p_ids: ids }); } catch {}
  }, 2500);
}
function stopViewFlusher() { if (viewTimer) clearInterval(viewTimer); viewTimer = null; }

/* ---------- بادج الرسايل ---------- */
export function convOtherId(c) { return c.user1 === store.me?.id ? c.user2 : c.user1; }
export function convMyReadAt(c) { return c.user1 === store.me?.id ? c.user1_read_at : c.user2_read_at; }
export function convUnread(c) {
  return c.last_sender && c.last_sender !== store.me?.id &&
    new Date(c.updated_at).getTime() > new Date(convMyReadAt(c)).getTime() + 500;
}
export function recalcDMBadge() {
  store.unreadDMs = [...store.convs.values()].filter(convUnread).length;
  store.emit('badges');
}

/* ---------- Realtime ---------- */
let channels = [];
let activeConvId = null;
export function setActiveConv(id) { activeConvId = id; }

export function startRealtime() {
  stopRealtime();
  const me = store.me;
  if (!me) return;

  // إشعارات + تحديثات المحادثات
  const ch1 = sb.channel('user-' + me.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` }, async (payload) => {
      const n = payload.new;
      store.unreadNotifs++;
      store.emit('badges');
      store.emit('notif', n);
      const profs = await profilesByIds([n.actor_id]).catch(() => new Map());
      const actor = profs.get(n.actor_id);
      const TXT = {
        like: 'عمل لايك على بوستك ❤️', comment: 'علّق على بوستك 💬', reply: 'رد على تعليقك ↩️',
        comment_like: 'حب تعليقك ❤️', follow: 'بدأ يتابعك ⭐', repost: 'عمل ريبوست 🔁',
        quote: 'اقتبس بوستك ✍️', mention: 'منشنك 📣',
      };
      sfx.notif();
      toast(`${actor?.display_name || 'حد'} ${TXT[n.type] || ''}`, {
        emoji: '🔔', color: 'var(--pk)',
        onClick: () => { location.hash = n.post_id ? `#/p/${n.post_id}` : `#/u/${actor?.username || ''}`; },
      });
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `user1=eq.${me.id}` }, (p) => handleConvChange(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `user2=eq.${me.id}` }, (p) => handleConvChange(p.new))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `user1=eq.${me.id}` }, (p) => handleConvChange(p.new))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `user2=eq.${me.id}` }, (p) => handleConvChange(p.new))
    .subscribe();

  // بوستات جديدة (بيل الفيد)
  const ch2 = sb.channel('feed-posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (p) => {
      if (p.new.author_id !== me.id) store.emit('newPost', p.new);
    })
    .subscribe();

  // التواجد (مين أونلاين)
  const pch = sb.channel('online', { config: { presence: { key: me.id } } });
  pch.on('presence', { event: 'sync' }, () => {
    store.online = new Set(Object.keys(pch.presenceState()));
    store.emit('presence');
  }).subscribe((status) => {
    if (status === 'SUBSCRIBED') pch.track({ at: Date.now() });
  });

  channels = [ch1, ch2, pch];
  startViewFlusher();
}

async function handleConvChange(conv) {
  store.convs.set(conv.id, conv);
  recalcDMBadge();
  store.emit('conv', conv);
  if (conv.last_sender && conv.last_sender !== store.me?.id && conv.id !== activeConvId) {
    const profs = await profilesByIds([convOtherId(conv)]).catch(() => new Map());
    const other = profs.get(convOtherId(conv));
    sfx.msg();
    toast(`${other?.display_name || 'رسالة جديدة'}: ${conv.last_message}`, {
      emoji: '💬', color: 'var(--bl)',
      onClick: () => { location.hash = `#/messages/${conv.id}`; },
    });
  }
}

export function stopRealtime() {
  channels.forEach((ch) => { try { sb.removeChannel(ch); } catch {} });
  channels = [];
  stopViewFlusher();
}

/* قناة محادثة مفتوحة */
export function subscribeConversation(convId, { onMessage, onUpdate, onDelete, onTyping }) {
  const ch = sb.channel('conv-' + convId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, (p) => onMessage?.(p.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, (p) => onUpdate?.(p.new))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (p) => onDelete?.(p.old))
    .on('broadcast', { event: 'typing' }, (p) => onTyping?.(p.payload))
    .subscribe();
  return {
    sendTyping() { try { ch.send({ type: 'broadcast', event: 'typing', payload: { user_id: store.me.id } }); } catch {} },
    unsubscribe() { try { sb.removeChannel(ch); } catch {} },
  };
}
