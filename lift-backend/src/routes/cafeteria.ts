// Tablas: "cafeteria_menu", "cafeteria_orders" (user_id bigint)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── MENÚ ──────────────────────────────────────────────────────

// GET /api/cafeteria/menu
router.get('/menu', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('cafeteria_menu').select('*').eq('active', true).order('category').order('name');
  if (error) throw error;
  return res.json(data || []);
});

// POST /api/cafeteria/menu
router.post('/menu', authorize('admin'), async (req: Request, res: Response) => {
  const schema = z.object({
    name:                z.string().min(2),
    category:            z.string(),
    price:               z.number().nonnegative(),
    image:               z.string().optional(),
    options:             z.array(z.string()).optional().default([]),
    points_per_purchase: z.number().int().optional().default(0),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('cafeteria_menu').insert(body).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// PUT /api/cafeteria/menu/:id
router.put('/menu/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('cafeteria_menu').update(req.body).eq('id', req.params.id).select().single();
  if (error || !data) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.json(data);
});

// DELETE /api/cafeteria/menu/:id
router.delete('/menu/:id', authorize('admin'), async (req: Request, res: Response) => {
  await supabase.from('cafeteria_menu').update({ active: false }).eq('id', req.params.id);
  return res.json({ ok: true });
});

// ── PEDIDOS ───────────────────────────────────────────────────

// GET /api/cafeteria/orders
router.get('/orders', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { user_id, status, date } = req.query as Record<string, string>;
  let query = supabase.from('cafeteria_orders').select('*').order('created_at', { ascending: false });
  if (user_id) query = query.eq('user_id', Number(user_id));
  if (status)  query = query.eq('status', status);
  if (date)    query = query.eq('order_date', date);
  const { data, error } = await query;
  if (error) throw error;
  return res.json(data || []);
});

// POST /api/cafeteria/orders — hacer pedido
router.post('/orders', async (req: Request, res: Response) => {
  const schema = z.object({
    user_id: z.number().int().optional(),
    items: z.array(z.object({
      product_id:   z.number(),
      product_name: z.string(),
      qty:          z.number().int().positive(),
      price:        z.number(),
      option:       z.string().optional(),
    })),
    method: z.string().optional(),
    notes:  z.string().optional(),
    paid:   z.boolean().optional().default(false),
  });
  const body = schema.parse(req.body);
  const total = body.items.reduce((s, i) => s + i.price * i.qty, 0);

  const now = new Date();
  let user_name = 'Invitado';
  if (body.user_id) {
    const { data: u } = await supabase.from('users').select('name').eq('id', body.user_id).single();
    if (u) user_name = u.name;
  }

  const { data, error } = await supabase.from('cafeteria_orders').insert({
    user_id: body.user_id,
    user_name,
    items: body.items,
    total,
    method: body.method,
    notes: body.notes,
    paid: body.paid,
    order_date: now.toISOString().slice(0, 10),
    order_time: now.toTimeString().slice(0, 5),
  }).select().single();
  if (error) throw error;

  // Puntos por compra
  if (body.user_id) {
    const totalPoints = await body.items.reduce(async (accP, item) => {
      const acc = await accP;
      const { data: prod } = await supabase.from('cafeteria_menu').select('points_per_purchase').eq('id', item.product_id).single();
      return acc + (prod?.points_per_purchase ?? 0) * item.qty;
    }, Promise.resolve(0));
    if (totalPoints > 0) {
      await supabase.from('points_log').insert({ user_id: body.user_id, user_name, action: 'cafeteria', points: totalPoints, detail: 'Compra cafetería' });
    }
  }

  return res.status(201).json(data);
});

// PUT /api/cafeteria/orders/:id/status
router.put('/orders/:id/status', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.enum(['pending', 'ready', 'delivered', 'cancelled']) }).parse(req.body);
  const { data, error } = await supabase.from('cafeteria_orders').update({ status, paid: status === 'delivered' }).eq('id', req.params.id).select().single();
  if (error || !data) return res.status(404).json({ error: 'Pedido no encontrado' });
  return res.json(data);
});

// GET /api/cafeteria/pending/:userId — cuenta abierta del socio
router.get('/pending/:userId', async (req: Request, res: Response) => {
  const { data } = await supabase.from('cafeteria_orders').select('*').eq('user_id', Number(req.params.userId)).eq('paid', false).neq('status', 'cancelled');
  const total = (data || []).reduce((s: number, o: { total: number }) => s + o.total, 0);
  return res.json({ orders: data || [], total });
});

export default router;
