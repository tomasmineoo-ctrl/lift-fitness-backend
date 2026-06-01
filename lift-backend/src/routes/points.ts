// Tablas: "points_log" (user_id bigint, user_name), "redemptions_log" (user_id bigint), "points_config"
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

async function getBalance(userId: string): Promise<number> {
  const [{ data: earned }, { data: used }] = await Promise.all([
    supabase.from('points_log').select('points').eq('user_id', Number(userId)),
    supabase.from('redemptions_log').select('points').eq('user_id', Number(userId)),
  ]);
  return (earned || []).reduce((s: number, p: { points: number }) => s + p.points, 0)
       - (used   || []).reduce((s: number, p: { points: number }) => s + p.points, 0);
}

// GET /api/points/balance/:userId
router.get('/balance/:userId', async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role === 'user' && user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  const balance = await getBalance(req.params.userId);
  return res.json({ balance });
});

// GET /api/points/log/:userId
router.get('/log/:userId', async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role === 'user' && user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  const { data } = await supabase.from('points_log').select('*').eq('user_id', Number(req.params.userId)).order('created_at', { ascending: false });
  return res.json(data || []);
});

// GET /api/points/redemptions/:userId
router.get('/redemptions/:userId', async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role === 'user' && user.id !== req.params.userId) {
    return res.status(403).json({ error: 'Sin permisos' });
  }
  const { data } = await supabase.from('redemptions_log').select('*').eq('user_id', Number(req.params.userId)).order('created_at', { ascending: false });
  return res.json(data || []);
});

// POST /api/points/add — agregar puntos manualmente (admin)
router.post('/add', authorize('admin'), async (req: Request, res: Response) => {
  const schema = z.object({
    user_id: z.number().int(),
    action:  z.string(),
    points:  z.number().int().positive(),
    detail:  z.string().optional(),
  });
  const body = schema.parse(req.body);
  const { data: member } = await supabase.from('users').select('name').eq('id', body.user_id).single();
  if (!member) return res.status(404).json({ error: 'Socio no encontrado' });

  const { data, error } = await supabase.from('points_log').insert({ ...body, user_name: member.name }).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// POST /api/points/redeem — canjear puntos por dinero
router.post('/redeem', async (req: Request, res: Response) => {
  const schema = z.object({
    user_id: z.number().int(),
    points:  z.number().int().positive(),
    detail:  z.string().optional(),
  });
  const { user_id, points, detail } = schema.parse(req.body);
  const userIdStr = String(user_id);

  const user = req.user!;
  if (user.role === 'user' && user.id !== userIdStr) return res.status(403).json({ error: 'Sin permisos' });

  const balance = await getBalance(userIdStr);
  if (balance < points) return res.status(400).json({ error: `Puntos insuficientes. Balance: ${balance}` });

  const { data: config } = await supabase.from('points_config').select('exchange_rate').eq('id', 1).single();
  const rate = config?.exchange_rate ?? 100;
  const amount = points / rate;

  const { data: member } = await supabase.from('users').select('name').eq('id', user_id).single();
  const { data, error } = await supabase.from('redemptions_log').insert({
    user_id,
    user_name: member?.name,
    type: 'cash',
    points,
    amount,
    detail: detail || `Canje $${amount.toFixed(2)}`,
  }).select().single();
  if (error) throw error;
  return res.status(201).json({ ...data, new_balance: balance - points, amount_value: amount });
});

// GET /api/points/config
router.get('/config', authorize('admin'), async (_req: Request, res: Response) => {
  const { data } = await supabase.from('points_config').select('*').eq('id', 1).single();
  return res.json(data);
});

// PUT /api/points/config
router.put('/config', authorize('admin'), async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('points_config').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', 1).select().single();
  if (error) throw error;
  return res.json(data);
});

// GET /api/points/ranking — top socios por puntos
router.get('/ranking', authorize('admin', 'trainer'), async (_req: Request, res: Response) => {
  const { data: logs } = await supabase.from('points_log').select('user_id, user_name, points');
  const { data: reds } = await supabase.from('redemptions_log').select('user_id, points');

  const map = new Map<number, { user_name: string; balance: number }>();
  for (const l of logs || []) {
    const cur = map.get(l.user_id) || { user_name: l.user_name, balance: 0 };
    cur.balance += l.points;
    map.set(l.user_id, cur);
  }
  for (const r of reds || []) {
    const cur = map.get(r.user_id);
    if (cur) cur.balance -= r.points;
  }

  const ranking = Array.from(map.entries())
    .map(([id, v]) => ({ user_id: id, ...v }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 20);

  return res.json(ranking);
});

export default router;
