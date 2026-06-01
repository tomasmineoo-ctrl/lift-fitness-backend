// Tablas: "classes" (id bigint), "class_enrollments" (user_id bigint)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/classes
router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('classes')
    .select(`*, class_enrollments(user_id, status)`)
    .order('day').order('time');
  if (error) throw error;

  const enriched = (data || []).map((c) => ({
    ...c,
    enrolled: (c.class_enrollments || []).filter((e: { status: string }) => e.status === 'enrolled').map((e: { user_id: number }) => e.user_id),
    waitlist: (c.class_enrollments || []).filter((e: { status: string }) => e.status === 'waitlist').map((e: { user_id: number }) => e.user_id),
    class_enrollments: undefined,
  }));
  return res.json(enriched);
});

// GET /api/classes/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data } = await supabase.from('classes').select(`*, class_enrollments(user_id, status, users(name))`).eq('id', Number(req.params.id)).single();
  if (!data) return res.status(404).json({ error: 'Clase no encontrada' });
  return res.json(data);
});

// POST /api/classes
router.post('/', authorize('admin', 'trainer'), async (req: Request, res: Response) => {
  const schema = z.object({
    type:     z.string(),
    trainer:  z.string().optional(),
    day:      z.string(),
    time:     z.string(),
    duration: z.number().int().optional(),
    capacity: z.number().int().optional(),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('classes').insert(body).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// PUT /api/classes/:id
router.put('/:id', authorize('admin', 'trainer'), async (req: Request, res: Response) => {
  const schema = z.object({
    type:     z.string().optional(),
    trainer:  z.string().optional(),
    day:      z.string().optional(),
    time:     z.string().optional(),
    duration: z.number().int().positive().optional(),
    capacity: z.number().int().positive().optional(),
    active:   z.boolean().optional(),
  });
  const body = schema.parse(req.body);
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { data, error } = await supabase.from('classes').update(body).eq('id', id).select().single();
  if (error || !data) return res.status(404).json({ error: 'Clase no encontrada' });
  return res.json(data);
});

// DELETE /api/classes/:id
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  await supabase.from('class_enrollments').delete().eq('class_id', Number(req.params.id));
  const { error } = await supabase.from('classes').delete().eq('id', Number(req.params.id));
  if (error) throw error;
  return res.json({ ok: true });
});

// POST /api/classes/:id/enroll
router.post('/:id/enroll', async (req: Request, res: Response) => {
  const { user_id } = z.object({ user_id: z.number().int() }).parse(req.body);
  const classId = Number(req.params.id);

  const { data: cls } = await supabase.from('classes').select('capacity').eq('id', classId).single();
  if (!cls) return res.status(404).json({ error: 'Clase no encontrada' });

  const { count: enrolled } = await supabase.from('class_enrollments').select('*', { count: 'exact', head: true }).eq('class_id', classId).eq('status', 'enrolled');
  const status = (enrolled ?? 0) >= cls.capacity ? 'waitlist' : 'enrolled';

  const { data, error } = await supabase.from('class_enrollments')
    .upsert({ class_id: classId, user_id, status }, { onConflict: 'class_id,user_id' })
    .select().single();
  if (error) throw error;

  if (status === 'enrolled') {
    const { data: user } = await supabase.from('users').select('name').eq('id', user_id).single();
    await supabase.from('points_log').insert({ user_id, user_name: user?.name, action: 'claseGrupal', points: 8, detail: 'Inscripción a clase' });
  }

  return res.json({ ok: true, status, data });
});

// DELETE /api/classes/:id/enroll/:userId
router.delete('/:id/enroll/:userId', async (req: Request, res: Response) => {
  const classId = Number(req.params.id);
  const userId  = Number(req.params.userId);

  await supabase.from('class_enrollments').update({ status: 'cancelled' }).eq('class_id', classId).eq('user_id', userId);

  // Promover al primero en lista de espera
  const { data: next } = await supabase.from('class_enrollments').select('id, user_id').eq('class_id', classId).eq('status', 'waitlist').order('enrolled_at').limit(1).single();
  if (next) {
    await supabase.from('class_enrollments').update({ status: 'enrolled' }).eq('id', next.id);
    const { data: user } = await supabase.from('users').select('name').eq('id', next.user_id).single();
    await supabase.from('user_notifications').insert({ user_id: next.user_id, title: 'Lugar disponible en clase', body: 'Se liberó un lugar y fuiste inscrito automáticamente.', notification_type: 'clase' });
    await supabase.from('points_log').insert({ user_id: next.user_id, user_name: user?.name, action: 'claseGrupal', points: 8, detail: 'Ingreso desde lista de espera' });
  }

  return res.json({ ok: true, promoted: next?.user_id || null });
});

export default router;
