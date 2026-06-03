// Tablas: "nutri_clients", "nutri_appointments"
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── CLIENTES ─────────────────────────────────────────────────

router.get('/clients', authorize('admin', 'nutritionist'), async (req: Request, res: Response) => {
  const gymId   = req.user!.gym_id;
  const nutriId = req.user!.id;
  const query = req.user!.role === 'admin'
    ? supabase.from('nutri_clients').select(`*, users(id, name, email, plan, status)`).eq('gym_id', gymId).order('created_at')
    : supabase.from('nutri_clients').select(`*, users(id, name, email, plan, status)`).eq('nutri_id', nutriId).eq('gym_id', gymId).order('created_at');

  const { data, error } = await query;
  if (error) throw error;
  return res.json(data || []);
});

router.post('/clients', authorize('admin', 'nutritionist'), async (req: Request, res: Response) => {
  const gymId = req.user!.gym_id;
  const schema = z.object({
    user_id: z.number().int(),
    goal:    z.string().optional(),
    notes:   z.string().optional(),
  });
  const body = schema.parse(req.body);

  const { data, error } = await supabase
    .from('nutri_clients')
    .insert({ nutri_id: req.user!.id, ...body, gym_id: gymId })
    .select(`*, users(id, name, email, plan)`)
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'El cliente ya está asignado a este nutricionista' });
    throw error;
  }
  return res.status(201).json(data);
});

router.put('/clients/:id', authorize('admin', 'nutritionist'), async (req: Request, res: Response) => {
  const q = supabase.from('nutri_clients').update(req.body).eq('id', req.params.id).eq('gym_id', req.user!.gym_id);
  const { data, error } = req.user!.role === 'nutritionist'
    ? await q.eq('nutri_id', req.user!.id).select().single()
    : await q.select().single();
  if (error || !data) return res.status(404).json({ error: 'Cliente no encontrado' });
  return res.json(data);
});

router.delete('/clients/:id', authorize('admin', 'nutritionist'), async (req: Request, res: Response) => {
  const q = supabase.from('nutri_clients').delete().eq('id', req.params.id).eq('gym_id', req.user!.gym_id);
  const { error } = req.user!.role === 'nutritionist'
    ? await q.eq('nutri_id', req.user!.id)
    : await q;
  if (error) throw error;
  return res.json({ ok: true });
});

// ── CITAS ─────────────────────────────────────────────────────

router.get('/appointments', authorize('admin', 'nutritionist'), async (req: Request, res: Response) => {
  const gymId = req.user!.gym_id;
  const { date, user_id } = req.query as Record<string, string>;
  let query = supabase.from('nutri_appointments').select('*').eq('gym_id', gymId).order('appointment_date').order('appointment_time');

  if (req.user!.role === 'nutritionist') query = query.eq('nutri_id', req.user!.id);
  if (date)    query = query.eq('appointment_date', date);
  if (user_id) query = query.eq('user_id', Number(user_id));

  const { data, error } = await query;
  if (error) throw error;
  return res.json(data || []);
});

router.get('/appointments/me', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('nutri_appointments')
    .select('*')
    .eq('user_id', Number(req.user!.id))
    .eq('gym_id', req.user!.gym_id)
    .order('appointment_date')
    .order('appointment_time');
  if (error) throw error;
  return res.json(data || []);
});

router.post('/appointments', authorize('admin', 'nutritionist'), async (req: Request, res: Response) => {
  const gymId = req.user!.gym_id;
  const schema = z.object({
    user_id:          z.number().int(),
    appointment_date: z.string(),
    appointment_time: z.string(),
    notes:            z.string().optional(),
  });
  const body = schema.parse(req.body);

  const { data: user } = await supabase.from('users').select('name').eq('id', body.user_id).eq('gym_id', gymId).single();

  const { data, error } = await supabase.from('nutri_appointments').insert({
    ...body,
    user_name:  user?.name,
    nutri_id:   req.user!.id,
    nutri_name: req.user!.name,
    status:     'scheduled',
    gym_id:     gymId,
  }).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

router.put('/appointments/:id', authorize('admin', 'nutritionist'), async (req: Request, res: Response) => {
  const q = supabase.from('nutri_appointments').update(req.body).eq('id', req.params.id).eq('gym_id', req.user!.gym_id);
  const { data, error } = req.user!.role === 'nutritionist'
    ? await q.eq('nutri_id', req.user!.id).select().single()
    : await q.select().single();
  if (error || !data) return res.status(404).json({ error: 'Cita no encontrada' });
  return res.json(data);
});

router.delete('/appointments/:id', authorize('admin', 'nutritionist'), async (req: Request, res: Response) => {
  const q = supabase.from('nutri_appointments').delete().eq('id', req.params.id).eq('gym_id', req.user!.gym_id);
  const { error } = req.user!.role === 'nutritionist'
    ? await q.eq('nutri_id', req.user!.id)
    : await q;
  if (error) throw error;
  return res.json({ ok: true });
});

export default router;
