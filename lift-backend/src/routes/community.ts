// Tablas: "community_posts", "post_likes", "post_comments", "community_challenges", "challenge_participants" (user_id bigint)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── POSTS ─────────────────────────────────────────────────────

// GET /api/community/posts
router.get('/posts', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`*, post_likes(user_id), post_comments(id, author_id, author_name, content, created_at)`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const posts = (data || []).map((p) => ({
    ...p,
    likes:         (p.post_likes    || []).map((l: { user_id: number }) => l.user_id),
    comments:      p.post_comments  || [],
    post_likes:    undefined,
    post_comments: undefined,
  }));
  return res.json(posts);
});

// POST /api/community/posts
router.post('/posts', async (req: Request, res: Response) => {
  const schema = z.object({
    content:   z.string().min(1),
    image_url: z.string().url().optional().or(z.literal('')),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('community_posts').insert({
    ...body,
    author_id:   req.user!.id,
    author_name: req.user!.name,
    author_role: req.user!.role,
  }).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// DELETE /api/community/posts/:id
router.delete('/posts/:id', async (req: Request, res: Response) => {
  const { data: post } = await supabase.from('community_posts').select('author_id').eq('id', req.params.id).single();
  if (!post) return res.status(404).json({ error: 'Post no encontrado' });

  const user = req.user!;
  if (String(post.author_id) !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  await supabase.from('community_posts').delete().eq('id', req.params.id);
  return res.json({ ok: true });
});

// POST /api/community/posts/:id/like — toggle like
router.post('/posts/:id/like', async (req: Request, res: Response) => {
  const postId = parseInt(req.params.id) || 0;
  if (!postId) return res.status(400).json({ error: 'ID inválido' });
  const userId = Number(req.user!.id);

  const { data: existing } = await supabase.from('post_likes').select('*').eq('post_id', postId).eq('user_id', userId).single();

  if (existing) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    return res.json({ liked: false });
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    return res.json({ liked: true });
  }
});

// POST /api/community/posts/:id/comments
router.post('/posts/:id/comments', async (req: Request, res: Response) => {
  const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
  const { data, error } = await supabase.from('post_comments').insert({
    post_id:     parseInt(req.params.id) || 0,
    author_id:   req.user!.id,
    author_name: req.user!.name,
    content,
  }).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// DELETE /api/community/comments/:id
router.delete('/comments/:id', async (req: Request, res: Response) => {
  const { data: comment } = await supabase.from('post_comments').select('author_id').eq('id', req.params.id).single();
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });

  const user = req.user!;
  if (String(comment.author_id) !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  await supabase.from('post_comments').delete().eq('id', req.params.id);
  return res.json({ ok: true });
});

// ── RETOS ─────────────────────────────────────────────────────

// GET /api/community/challenges
router.get('/challenges', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('community_challenges')
    .select(`*, challenge_participants(user_id, validated)`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const challenges = (data || []).map((c) => ({
    ...c,
    participants:           (c.challenge_participants || []).map((p: { user_id: number }) => p.user_id),
    validated:              (c.challenge_participants || []).filter((p: { validated: boolean }) => p.validated).map((p: { user_id: number }) => p.user_id),
    challenge_participants: undefined,
  }));
  return res.json(challenges);
});

// POST /api/community/challenges
router.post('/challenges', authorize('admin', 'trainer'), async (req: Request, res: Response) => {
  const schema = z.object({
    title:       z.string().min(2),
    description: z.string().optional(),
    type:        z.string().optional(),
    points:      z.number().int().optional().default(0),
    start_date:  z.string().optional(),
    end_date:    z.string().optional(),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('community_challenges').insert(body).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// PUT /api/community/challenges/:id
router.put('/challenges/:id', authorize('admin', 'trainer'), async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('community_challenges').update(req.body).eq('id', req.params.id).select().single();
  if (error || !data) return res.status(404).json({ error: 'Reto no encontrado' });
  return res.json(data);
});

// POST /api/community/challenges/:id/join
router.post('/challenges/:id/join', async (req: Request, res: Response) => {
  const challengeId = parseInt(req.params.id);
  const userId = req.user!.role === 'user'
    ? Number(req.user!.id)
    : z.object({ user_id: z.number().int() }).parse(req.body).user_id;

  const { error } = await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: userId });
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya participás en este reto' });
    throw error;
  }
  return res.json({ ok: true });
});

// POST /api/community/challenges/:id/validate/:userId
router.post('/challenges/:id/validate/:userId', authorize('admin', 'trainer'), async (req: Request, res: Response) => {
  const challengeId = parseInt(req.params.id);
  const userId = parseInt(req.params.userId);

  await supabase.from('challenge_participants').update({ validated: true }).eq('challenge_id', challengeId).eq('user_id', userId);

  // Otorgar puntos
  const { data: challenge } = await supabase.from('community_challenges').select('points, title').eq('id', challengeId).single();
  if (challenge?.points) {
    const { data: member } = await supabase.from('users').select('name').eq('id', userId).single();
    await supabase.from('points_log').insert({ user_id: userId, user_name: member?.name, action: 'reto', points: challenge.points, detail: challenge.title });
  }

  return res.json({ ok: true });
});

export default router;
