// Tabla en Supabase: "users" (id bigint, pass, pin, etc.)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { supabase } from '../config/supabase';
import { authenticate, authorize, authorizeOwnerOrRoles } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const PLAN_PRICES: Record<string, number> = { Bronce: 25, Plata: 35, Oro: 50, Diamante: 75 };

function getQuotaStatus(u: { frozen: boolean; status: string; last_payment: string | null }) {
  if (u.frozen) return { status: 'frozen', label: 'Congelada' };
  const now = new Date();
  const day = now.getDate();
  if (u.status === 'blocked') return { status: 'blocked', label: 'Bloqueado' };
  if (u.last_payment) {
    const lp = new Date(u.last_payment);
    if (lp.getMonth() === now.getMonth() && lp.getFullYear() === now.getFullYear())
      return { status: 'active', label: 'Al día' };
  }
  if (u.status === 'inactive') {
    if (day > 10) return { status: 'blocked', label: 'Bloqueado' };
    if (day > 7)  return { status: 'grace',   label: 'En gracia' };
    return { status: 'inactive', label: 'Vencida' };
  }
  if (day <= 7)  return { status: 'warning', label: 'Por vencer' };
  if (day <= 10) return { status: 'grace',   label: 'En gracia' };
  return { status: 'blocked', label: 'Bloqueado' };
}

// GET /api/members
router.get('/', authorize('admin', 'reception', 'trainer', 'nutritionist'), async (req: Request, res: Response) => {
  const gymId = req.user!.gym_id;
  const { search, plan, status, page = '1', limit = '50' } = req.query as Record<string, string>;
  let query = supabase.from('users').select('*', { count: 'exact' }).eq('gym_id', gymId);

  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,dni.ilike.%${search}%`);
  if (plan)   query = query.eq('plan', plan);
  if (status) query = query.eq('status', status);

  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, parseInt(limit) || 50);
  query = query.range((p - 1) * l, p * l - 1).order('name');

  const { data, count, error } = await query;
  if (error) throw error;

  const result = (data || []).map((u) => ({
    ...u,
    pass: undefined,
    quotaStatus: getQuotaStatus(u),
    planPrice: PLAN_PRICES[u.plan] ?? 0,
  }));
  return res.json({ data: result, total: count, page: p, limit: l });
});

// GET /api/members/:id
router.get('/:id', authorizeOwnerOrRoles((r) => r.params.id, 'admin', 'reception', 'trainer', 'nutritionist'), async (req: Request, res: Response) => {
  const { data } = await supabase.from('users').select('*').eq('id', Number(req.params.id)).eq('gym_id', req.user!.gym_id).single();
  if (!data) return res.status(404).json({ error: 'Socio no encontrado' });
  return res.json({ ...data, pass: undefined, quotaStatus: getQuotaStatus(data), planPrice: PLAN_PRICES[data.plan] ?? 0 });
});

// POST /api/members
router.post('/', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const schema = z.object({
    name:         z.string().min(2),
    email:        z.string().email(),
    password:     z.string().min(4),
    pin:          z.string().length(4).optional(),
    phone:        z.string().optional(),
    dni:          z.string().optional(),
    nationality:  z.string().optional(),
    dob:          z.string().optional(),
    address:      z.string().optional(),
    weight:       z.number().optional(),
    height:       z.number().optional(),
    blood_type:   z.string().optional(),
    med_coverage: z.string().optional(),
    med_clearance:z.boolean().optional(),
    plan:         z.enum(['Bronce','Plata','Oro','Diamante']).optional(),
    pay_method:   z.string().optional(),
    insc_date:    z.string().optional(),
  });
  const { password, ...rest } = schema.parse(req.body);

  const { data: hashedPass } = await supabase.rpc('hash_password', { plain: password }).single();

  const { data, error } = await supabase
    .from('users')
    .insert({ ...rest, pass: hashedPass, gym_id: req.user!.gym_id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email ya registrado' });
    throw error;
  }

  await supabase.from('admin_log').insert({
    action: 'Socio creado',
    admin_email: req.user!.email,
    details: `${data.name} — Plan ${data.plan}`,
    gym_id: req.user!.gym_id,
  });

  return res.status(201).json({ ...data, pass: undefined });
});

// PUT /api/members/:id
router.put('/:id', authorizeOwnerOrRoles((r) => r.params.id, 'admin', 'reception'), async (req: Request, res: Response) => {
  const schema = z.object({
    name:          z.string().min(2).optional(),
    phone:         z.string().optional(),
    dni:           z.string().optional(),
    dob:           z.string().optional(),
    address:       z.string().optional(),
    nationality:   z.string().optional(),
    weight:        z.number().min(0).max(500).optional().nullable(),
    height:        z.number().min(0).max(300).optional().nullable(),
    blood_type:    z.string().optional(),
    med_coverage:  z.string().optional(),
    med_clearance: z.boolean().optional(),
    plan:          z.enum(['Bronce','Plata','Oro','Diamante']).optional(),
    pay_method:    z.string().optional(),
    status:        z.enum(['active','inactive','blocked','frozen']).optional(),
    debt:          z.number().min(0).optional(),
    last_payment:  z.string().optional().nullable(),
    password:      z.string().min(4).optional(),
  });
  const { password, ...rest } = schema.parse(req.body);
  const updates: Record<string, unknown> = { ...rest };

  if (password) {
    const { data: h } = await supabase.rpc('hash_password', { plain: password }).single();
    updates.pass = h;
  }

  const { data, error } = await supabase.from('users').update(updates).eq('id', Number(req.params.id)).eq('gym_id', req.user!.gym_id).select().single();
  if (error || !data) return res.status(404).json({ error: 'Socio no encontrado' });
  return res.json({ ...data, pass: undefined });
});

// DELETE /api/members/:id
router.delete('/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { error } = await supabase.from('users').delete().eq('id', Number(req.params.id)).eq('gym_id', req.user!.gym_id);
  if (error) throw error;
  return res.json({ ok: true });
});

// GET /api/members/:id/quota-status
router.get('/:id/quota-status', authorizeOwnerOrRoles((r) => r.params.id, 'admin', 'reception'), async (req: Request, res: Response) => {
  const { data } = await supabase.from('users').select('frozen, status, last_payment').eq('id', Number(req.params.id)).eq('gym_id', req.user!.gym_id).single();
  if (!data) return res.status(404).json({ error: 'Socio no encontrado' });
  return res.json(getQuotaStatus(data));
});

// POST /api/members/:id/freeze
router.post('/:id/freeze', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { data } = await supabase.from('users').update({ frozen: true, status: 'frozen' }).eq('id', Number(req.params.id)).eq('gym_id', req.user!.gym_id).select('name').single();
  await supabase.from('admin_log').insert({ action: 'Membresía congelada', admin_email: req.user!.email, details: data?.name, gym_id: req.user!.gym_id });
  return res.json({ ok: true });
});

// POST /api/members/:id/unfreeze
router.post('/:id/unfreeze', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { data } = await supabase.from('users').update({ frozen: false, status: 'inactive' }).eq('id', Number(req.params.id)).eq('gym_id', req.user!.gym_id).select('name').single();
  await supabase.from('admin_log').insert({ action: 'Membresía descongelada', admin_email: req.user!.email, details: data?.name, gym_id: req.user!.gym_id });
  return res.json({ ok: true });
});

// GET /api/members/:id/qr
router.get('/:id/qr', authorizeOwnerOrRoles((r) => r.params.id, 'admin', 'reception'), async (req: Request, res: Response) => {
  const { data } = await supabase.from('users').select('id, name').eq('id', Number(req.params.id)).eq('gym_id', req.user!.gym_id).single();
  if (!data) return res.status(404).json({ error: 'Socio no encontrado' });
  const payload = JSON.stringify({ userId: data.id, gymId: req.user!.gym_id, ts: Date.now() });
  const qr = await QRCode.toDataURL(payload);
  return res.json({ qr, userId: data.id, name: data.name });
});

// GET /api/members/:id/pay-history
router.get('/:id/pay-history', authorizeOwnerOrRoles((r) => r.params.id, 'admin', 'reception'), async (req: Request, res: Response) => {
  const { data } = await supabase.from('pay_history').select('*').eq('user_id', Number(req.params.id)).eq('gym_id', req.user!.gym_id).order('pay_date', { ascending: false });
  return res.json(data || []);
});

export default router;
