// Tabla: "access_log" (user_id bigint, access_type, access_method, log_date, log_timestamp)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/access/log
router.get('/log', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { user_id, date, page = '1', limit = '100' } = req.query as Record<string, string>;
  let query = supabase.from('access_log').select('*', { count: 'exact' }).order('log_timestamp', { ascending: false });

  if (user_id) query = query.eq('user_id', Number(user_id));
  if (date)    query = query.eq('log_date', date);

  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(200, parseInt(limit) || 100);
  query = query.range((p - 1) * l, p * l - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  return res.json({ data: data || [], total: count });
});

// POST /api/access/entry — registrar entrada
router.post('/entry', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { user_id, method = 'manual' } = z.object({
    user_id: z.number().int(),
    method:  z.enum(['QR', 'PIN', 'manual']).optional(),
  }).parse(req.body);

  const { data: user } = await supabase.from('users').select('name, status, frozen, last_payment, plan').eq('id', user_id).single();
  if (!user) return res.status(404).json({ error: 'Socio no encontrado' });

  const now = new Date();
  const day = now.getDate();
  let allowed = true;
  let reason  = '';

  if (user.frozen)              { allowed = false; reason = 'Membresía congelada'; }
  else if (user.status === 'blocked') { allowed = false; reason = 'Acceso bloqueado — cuota vencida'; }
  else if (!user.last_payment) {
    if (day > 10) { allowed = false; reason = 'Sin pago registrado'; }
  } else {
    const lp = new Date(user.last_payment);
    const paidThisMonth = lp.getMonth() === now.getMonth() && lp.getFullYear() === now.getFullYear();
    if (!paidThisMonth && day > 10) { allowed = false; reason = 'Cuota vencida'; }
  }

  const { data: log, error } = await supabase.from('access_log').insert({
    user_id,
    user_name:     user.name,
    access_type:   'entry',
    access_method: method,
    allowed,
    log_date:      now.toISOString().slice(0, 10),
  }).select().single();
  if (error) throw error;

  if (allowed) {
    await supabase.from('points_log').insert({ user_id, user_name: user.name, action: 'asistencia', points: 10, detail: 'Check-in' });
  }

  return res.json({ ...log, reason: allowed ? null : reason });
});

// POST /api/access/verify — kiosko QR/PIN
router.post('/verify', async (req: Request, res: Response) => {
  const { user_id, pin } = z.object({
    user_id: z.number().int().optional(),
    pin:     z.string().length(4).optional(),
  }).parse(req.body);

  let userId = user_id;
  if (!userId && pin) {
    const { data } = await supabase.from('users').select('id').eq('pin', pin).single();
    if (!data) return res.json({ allowed: false, reason: 'PIN incorrecto' });
    userId = data.id;
  }
  if (!userId) return res.status(400).json({ error: 'Requiere user_id o pin' });

  const { data: user } = await supabase.from('users').select('id, name, status, frozen, last_payment, plan, med_clearance').eq('id', userId).single();
  if (!user) return res.json({ allowed: false, reason: 'Socio no encontrado' });

  const now = new Date();
  const day = now.getDate();
  let allowed = true;
  let reason  = '';

  if (user.frozen)              { allowed = false; reason = 'Membresía congelada'; }
  else if (user.status === 'blocked') { allowed = false; reason = 'Acceso bloqueado'; }
  else if (user.last_payment) {
    const lp = new Date(user.last_payment);
    const paid = lp.getMonth() === now.getMonth() && lp.getFullYear() === now.getFullYear();
    if (!paid && day > 10) { allowed = false; reason = 'Cuota vencida'; }
  } else if (day > 10) {
    allowed = false; reason = 'Sin pago registrado';
  }

  return res.json({ allowed, reason: allowed ? null : reason, user: { id: user.id, name: user.name, plan: user.plan, med_clearance: user.med_clearance } });
});

export default router;
