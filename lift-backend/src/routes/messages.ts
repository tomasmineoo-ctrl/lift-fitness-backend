// Usa "chat_messages" (nueva tabla peer-to-peer)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/messages/conversations
router.get('/conversations', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { data } = await supabase.from('chat_messages').select('*').or(`from_id.eq.${userId},to_id.eq.${userId}`).order('created_at', { ascending: false });
  if (!data) return res.json([]);

  const convMap = new Map<string, { other_id: string; other_name: string; last_message: string; unread: number; updated_at: string }>();
  for (const msg of data) {
    const otherId   = msg.from_id === userId ? msg.to_id   : msg.from_id;
    const otherName = msg.from_id === userId ? msg.to_name : msg.from_name;
    if (!convMap.has(otherId)) {
      convMap.set(otherId, { other_id: otherId, other_name: otherName, last_message: msg.content, unread: 0, updated_at: msg.created_at });
    }
    if (msg.to_id === userId && !msg.read) convMap.get(otherId)!.unread++;
  }
  return res.json(Array.from(convMap.values()));
});

// GET /api/messages/user/:userId — admin: todos los mensajes de un socio (cualquier dirección)
// IMPORTANTE: debe ir ANTES de /:withUserId para no ser capturado por el catch-all
router.get('/user/:userId', async (req: Request, res: Response) => {
  const uid = String(req.params.userId);
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .or(`from_id.eq.${uid},to_id.eq.${uid}`)
    .order('created_at');
  if (error) throw error;
  return res.json(data || []);
});

// GET /api/messages/:withUserId
router.get('/:withUserId', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { withUserId } = req.params;

  const { data, error } = await supabase.from('chat_messages').select('*')
    .or(`and(from_id.eq.${userId},to_id.eq.${withUserId}),and(from_id.eq.${withUserId},to_id.eq.${userId})`)
    .order('created_at');
  if (error) throw error;

  // Marcar como leídos
  await supabase.from('chat_messages').update({ read: true }).eq('to_id', userId).eq('from_id', withUserId).eq('read', false);

  return res.json(data || []);
});

// POST /api/messages
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    to_id:   z.string(),
    to_name: z.string().optional(),
    content: z.string().min(1),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('chat_messages').insert({
    from_id:   req.user!.id,
    from_name: req.user!.name,
    to_id:     body.to_id,
    to_name:   body.to_name,
    content:   body.content,
  }).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// PUT /api/messages/:id/read
router.put('/:id/read', async (req: Request, res: Response) => {
  await supabase.from('chat_messages').update({ read: true }).eq('id', Number(req.params.id)).eq('to_id', req.user!.id);
  return res.json({ ok: true });
});

export default router;
