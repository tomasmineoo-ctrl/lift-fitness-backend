// Tablas: "shop_products", "shop_orders" (user_id bigint), "redemptions_log" (user_id bigint)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/shop/products
router.get('/products', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('shop_products').select('*').eq('active', true).order('category').order('name');
  if (error) throw error;
  return res.json(data || []);
});

// POST /api/shop/products
router.post('/products', authorize('admin'), async (req: Request, res: Response) => {
  const schema = z.object({
    name:     z.string().min(2),
    category: z.string().optional(),
    price:    z.number().nonnegative().optional().default(0),
    points:   z.number().int().positive(),
    image:    z.string().optional(),
    stock:    z.number().int().nonnegative().optional().default(0),
    type:     z.enum(['dinero', 'puntos', 'mixto']).optional().default('puntos'),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('shop_products').insert(body).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

// PUT /api/shop/products/:id
router.put('/products/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('shop_products').update(req.body).eq('id', req.params.id).select().single();
  if (error || !data) return res.status(404).json({ error: 'Producto no encontrado' });
  return res.json(data);
});

// DELETE /api/shop/products/:id
router.delete('/products/:id', authorize('admin'), async (req: Request, res: Response) => {
  await supabase.from('shop_products').update({ active: false }).eq('id', req.params.id);
  return res.json({ ok: true });
});

// GET /api/shop/orders
router.get('/orders', authorize('admin'), async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('shop_orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return res.json(data || []);
});

// GET /api/shop/orders/user/:userId
router.get('/orders/user/:userId', async (req: Request, res: Response) => {
  const { data } = await supabase.from('shop_orders').select('*').eq('user_id', Number(req.params.userId)).order('created_at', { ascending: false });
  return res.json(data || []);
});

// POST /api/shop/orders — canjear / comprar
router.post('/orders', async (req: Request, res: Response) => {
  const schema = z.object({
    product_id: z.number().int(),
    user_id:    z.number().int(),
  });
  const { product_id, user_id } = schema.parse(req.body);

  const user = req.user!;
  if (user.role === 'user' && user.id !== String(user_id)) {
    return res.status(403).json({ error: 'Sin permisos' });
  }

  const [{ data: product }, { data: member }] = await Promise.all([
    supabase.from('shop_products').select('*').eq('id', product_id).single(),
    supabase.from('users').select('name').eq('id', user_id).single(),
  ]);

  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  if (!product.active) return res.status(400).json({ error: 'Producto no disponible' });
  if (product.stock <= 0 && product.stock !== 99) return res.status(400).json({ error: 'Sin stock' });

  // Verificar puntos suficientes
  const { data: ptsEarned } = await supabase.from('points_log').select('points').eq('user_id', user_id);
  const { data: ptsUsed }   = await supabase.from('redemptions_log').select('points').eq('user_id', user_id);
  const balance = (ptsEarned || []).reduce((s: number, p: { points: number }) => s + p.points, 0)
                - (ptsUsed   || []).reduce((s: number, p: { points: number }) => s + p.points, 0);

  if (balance < product.points) {
    return res.status(400).json({ error: `Puntos insuficientes. Tenés ${balance}, necesitás ${product.points}` });
  }

  // Crear orden
  const { data: order, error } = await supabase.from('shop_orders').insert({
    user_id,
    user_name:    member?.name,
    product_id,
    product_name: product.name,
    points:       product.points,
    amount:       product.price,
    status:       'approved',
  }).select().single();
  if (error) throw error;

  // Descontar puntos
  await supabase.from('redemptions_log').insert({
    user_id,
    user_name: member?.name,
    type:   'shop',
    points: product.points,
    amount: product.price,
    detail: product.name,
  });

  // Descontar stock
  if (product.stock !== 99) {
    await supabase.from('shop_products').update({ stock: product.stock - 1 }).eq('id', product_id);
  }

  return res.status(201).json(order);
});

// GET /api/shop/ventas
router.get('/ventas', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const gymId = req.user!.gym_id;
  const { data, error } = await supabase
    .from('shop_ventas')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return res.json(data || []);
});

// POST /api/shop/ventas
router.post('/ventas', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const schema = z.object({
    producto_id:      z.string().optional().nullable(),
    producto_nombre:  z.string().min(1),
    producto_emoji:   z.string().optional().nullable(),
    user_id:          z.number().int().optional().nullable(),
    user_name:        z.string().optional().nullable(),
    cantidad:         z.number().int().positive().default(1),
    metodo_pago:      z.string().min(1),
    precio_total:     z.number().nonnegative().default(0),
    puntos_otorgados: z.number().int().nonnegative().default(0),
    fecha:            z.string().optional(),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase
    .from('shop_ventas')
    .insert({ ...body, gym_id: req.user!.gym_id })
    .select()
    .single();
  if (error) throw error;
  return res.status(201).json(data);
});

export default router;
