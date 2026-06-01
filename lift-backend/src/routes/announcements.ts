// Tabla: "announcements" (content en vez de body, announcement_date)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/announcements
router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('announcements').select('*').order('announcement_date', { ascending: false });
  if (error) throw error;
  return res.json(data || []);
});

// POST /api/announcements
router.post('/', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const schema = z.object({
    title:       z.string().min(2),
    content:     z.string().optional(),
    target:      z.string().optional(),
    author_name: z.string().optional(),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...body, author_name: body.author_name || req.user!.name })
    .select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// PUT /api/announcements/:id
router.put('/:id', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const schema = z.object({
    title:       z.string().min(2).optional(),
    content:     z.string().optional(),
    target:      z.string().optional(),
    author_name: z.string().optional(),
  });
  const body = schema.parse(req.body);
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { data, error } = await supabase.from('announcements').update(body).eq('id', id).select().single();
  if (error || !data) return res.status(404).json({ error: 'Comunicado no encontrado' });
  return res.json(data);
});

// DELETE /api/announcements/:id
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
  return res.json({ ok: true });
});

export default router;
