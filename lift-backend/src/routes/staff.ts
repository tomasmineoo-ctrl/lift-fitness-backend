// Tabla: "staff" (id UUID, password_hash)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/staff/me
router.get('/me', async (req: Request, res: Response) => {
  const user = req.user!;
  const { data } = await supabase.from('staff').select('id, email, name, role, active, pin').eq('email', user.email).eq('gym_id', user.gym_id).single();
  if (!data) return res.status(404).json({ error: 'Staff no encontrado' });
  return res.json(data);
});

// GET /api/staff
router.get('/', authorize('admin'), async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('staff').select('id, email, name, role, active, pin, created_at').eq('gym_id', req.user!.gym_id).order('name');
  if (error) throw error;
  return res.json(data || []);
});

// GET /api/staff/:id
router.get('/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { data } = await supabase.from('staff').select('id, email, name, role, active, pin, created_at').eq('id', req.params.id).eq('gym_id', req.user!.gym_id).single();
  if (!data) return res.status(404).json({ error: 'Staff no encontrado' });
  return res.json(data);
});

// POST /api/staff
router.post('/', authorize('admin'), async (req: Request, res: Response) => {
  const schema = z.object({
    email:    z.string().email(),
    password: z.string().min(6),
    name:     z.string().min(2),
    role:     z.enum(['admin','trainer','reception','nutritionist']),
    pin:      z.string().min(3).max(10).regex(/^\d+$/).optional(),
    pin2:     z.string().min(3).max(10).regex(/^\d+$/).optional().nullable(),
    phone:    z.string().optional(),
    dni:      z.string().optional(),
  });
  const { password, ...rest } = schema.parse(req.body) as Record<string, unknown> & { password?: string };

  // Auto-set PIN from DNI digits if no explicit PIN provided
  const pinFromDni = (rest.dni as string | undefined) ? (rest.dni as string).replace(/\D/g, '') : undefined;
  if (!rest.pin && pinFromDni && pinFromDni.length >= 3) {
    rest.pin = pinFromDni;
  }

  const { data: hashed } = await supabase.rpc('hash_password', { plain: password! }).single();
  const { data, error } = await supabase
    .from('staff')
    .insert({ ...rest, password_hash: hashed, gym_id: req.user!.gym_id })
    .select('id, email, name, role, active')
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email ya registrado' });
    throw error;
  }
  await supabase.from('admin_log').insert({ action: 'Staff creado', admin_email: req.user!.email, details: `${data.name} — ${data.role}`, gym_id: req.user!.gym_id });
  return res.status(201).json(data);
});

// PUT /api/staff/:id
router.put('/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { password, ...rest } = req.body;
  const updates: Record<string, unknown> = { ...rest };
  if (password) {
    const { data: h } = await supabase.rpc('hash_password', { plain: password }).single();
    updates.password_hash = h;
  }
  const { data, error } = await supabase.from('staff').update(updates).eq('id', req.params.id).eq('gym_id', req.user!.gym_id).select('id, email, name, role, active').single();
  if (error || !data) return res.status(404).json({ error: 'Staff no encontrado' });
  return res.json(data);
});

// DELETE /api/staff/:id — soft delete
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { error } = await supabase.from('staff').update({ active: false }).eq('id', req.params.id).eq('gym_id', req.user!.gym_id);
  if (error) throw error;
  return res.json({ ok: true });
});

export default router;
