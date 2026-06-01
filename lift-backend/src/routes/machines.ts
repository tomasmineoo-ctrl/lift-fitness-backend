// Tabla: "machines" (status en vez de active, usage_instructions)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/machines
router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('machines').select('*').neq('status', 'inactive').order('category').order('name');
  if (error) throw error;
  return res.json(data || []);
});

// GET /api/machines/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data } = await supabase.from('machines').select('*').eq('id', req.params.id).single();
  if (!data) return res.status(404).json({ error: 'Máquina no encontrada' });
  return res.json(data);
});

// POST /api/machines
router.post('/', authorize('admin', 'trainer'), async (req: Request, res: Response) => {
  const schema = z.object({
    name:               z.string().min(2),
    category:           z.string().optional(),
    description:        z.string().optional(),
    usage_instructions: z.string().optional(),
    video_url:          z.string().url().optional().or(z.literal('')),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('machines').insert(body).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// PUT /api/machines/:id
router.put('/:id', authorize('admin', 'trainer'), async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('machines').update(req.body).eq('id', req.params.id).select().single();
  if (error || !data) return res.status(404).json({ error: 'Máquina no encontrada' });
  return res.json(data);
});

// DELETE /api/machines/:id — soft delete via status
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { error } = await supabase.from('machines').update({ status: 'inactive' }).eq('id', req.params.id);
  if (error) throw error;
  return res.json({ ok: true });
});

export default router;
