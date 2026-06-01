// Tabla: "payments" (user_id bigint, payment_date, user_name, last_4, payment_method)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const PLAN_PRICES: Record<string, number> = { Bronce: 25, Plata: 35, Oro: 50, Diamante: 75 };

// GET /api/payments
router.get('/', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { user_id, status, from, to, page = '1', limit = '50' } = req.query as Record<string, string>;
  let query = supabase.from('payments').select('*', { count: 'exact' }).order('payment_date', { ascending: false });

  if (user_id) query = query.eq('user_id', Number(user_id));
  if (status)  query = query.eq('status', status);
  if (from)    query = query.gte('payment_date', from);
  if (to)      query = query.lte('payment_date', to);

  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, parseInt(limit) || 50);
  query = query.range((p - 1) * l, p * l - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  return res.json({ data: data || [], total: count, page: p, limit: l });
});

// GET /api/payments/:id
router.get('/:id', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { data } = await supabase.from('payments').select('*').eq('id', Number(req.params.id)).single();
  if (!data) return res.status(404).json({ error: 'Pago no encontrado' });
  return res.json(data);
});

// POST /api/payments — cobrar cuota
router.post('/', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const schema = z.object({
    user_id:        z.number().int(),
    amount:         z.number().positive(),
    plan:           z.string().optional(),
    payment_method: z.string().optional(),
    brand:          z.string().optional(),
    bank:           z.string().optional(),
    card_type:      z.string().optional(),
    last_4:         z.string().optional(),
    installments:   z.number().int().optional(),
    status:         z.enum(['pending','approved','rejected']).optional().default('approved'),
  });
  const body = schema.parse(req.body);

  const { data: user } = await supabase.from('users').select('name, plan').eq('id', body.user_id).single();
  if (!user) return res.status(404).json({ error: 'Socio no encontrado' });

  const txId = 'TX-' + Date.now().toString().slice(-6);
  const { data: payment, error } = await supabase.from('payments').insert({
    ...body,
    user_name: user.name,
    plan: body.plan || user.plan,
    transaction_id: txId,
  }).select().single();
  if (error) throw error;

  if (payment.status === 'approved') {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('users').update({ last_payment: today, status: 'active', debt: 0 }).eq('id', body.user_id);
    await supabase.from('pay_history').insert({
      user_id: body.user_id,
      pay_date: today,
      amount: body.amount,
      method: body.payment_method,
      plan: body.plan || user.plan,
      payment_id: payment.id,
    });
    // Puntos por renovación
    await supabase.from('points_log').insert({ user_id: body.user_id, user_name: user.name, action: 'renovacion', points: 150, detail: `Pago ${txId}` });
  }

  await supabase.from('admin_log').insert({ action: 'Pago registrado', admin_email: req.user!.email, details: `${user.name} — $${body.amount} (${txId})` });
  return res.status(201).json(payment);
});

// PUT /api/payments/:id
router.put('/:id', authorize('admin'), async (req: Request, res: Response) => {
  const schema = z.object({
    amount:         z.number().positive().optional(),
    status:         z.enum(['pending','approved','rejected']).optional(),
    payment_method: z.string().optional(),
    plan:           z.string().optional(),
    payment_date:   z.string().optional(),
    notes:          z.string().optional(),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('payments').update(body).eq('id', Number(req.params.id)).select().single();
  if (error || !data) return res.status(404).json({ error: 'Pago no encontrado' });
  return res.json(data);
});

// GET /api/payments/stats/monthly
router.get('/stats/monthly', authorize('admin', 'reception'), async (_req: Request, res: Response) => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleDateString('es', { month: 'short' }) };
  }).reverse();

  const totals = await Promise.all(months.map(async ({ year, month, label }) => {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = new Date(year, month, 0).toISOString().slice(0, 10);
    const { data } = await supabase.from('payments').select('amount').eq('status', 'approved').gte('payment_date', from).lte('payment_date', to);
    return { label, total: (data || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0) };
  }));
  return res.json(totals);
});

// GET /api/payments/user/:userId — admin/reception ven a cualquiera; user solo puede ver sus propios
router.get('/user/:userId', async (req: Request, res: Response) => {
  const caller = req.user!;
  // Un socio solo puede ver sus propios pagos
  if (caller.role === 'user' && String(caller.id) !== String(req.params.userId)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  if (!['admin', 'reception', 'user'].includes(caller.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { data } = await supabase.from('payments').select('*').eq('user_id', Number(req.params.userId)).order('payment_date', { ascending: false });
  return res.json(data || []);
});

export default router;
