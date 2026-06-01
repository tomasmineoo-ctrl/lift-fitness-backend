// Tabla: "expenses" (expense_date en vez de date)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/expenses/categories  — antes del /:id para no colisionar
router.get('/categories', async (_req: Request, res: Response) => {
  const { data } = await supabase.from('expense_categories').select('*').order('name');
  return res.json(data || []);
});

router.post('/categories', authorize('admin'), async (req: Request, res: Response) => {
  const body = z.object({ name: z.string(), icon: z.string().optional(), color: z.string().optional() }).parse(req.body);
  const { data, error } = await supabase.from('expense_categories').insert(body).select().single();
  if (error) throw error;
  return res.status(201).json(data);
});

router.put('/categories/:id', authorize('admin'), async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('expense_categories').update(req.body).eq('id', Number(req.params.id)).select().single();
  if (error || !data) return res.status(404).json({ error: 'Categoría no encontrada' });
  return res.json(data);
});

router.delete('/categories/:id', authorize('admin'), async (req: Request, res: Response) => {
  await supabase.from('expense_categories').delete().eq('id', Number(req.params.id));
  return res.json({ ok: true });
});

// ── GASTOS ────────────────────────────────────────────────────

router.use(authorize('admin'));

// GET /api/expenses
router.get('/', async (req: Request, res: Response) => {
  const { from, to, category_id } = req.query as Record<string, string>;
  let query = supabase.from('expenses').select('*, expense_categories(name, icon, color)').order('expense_date', { ascending: false });
  if (from)        query = query.gte('expense_date', from);
  if (to)          query = query.lte('expense_date', to);
  if (category_id) query = query.eq('category_id', Number(category_id));
  const { data, error } = await query;
  if (error) throw error;
  return res.json(data || []);
});

// POST /api/expenses
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    expense_date: z.string(),
    category_id:  z.number().int(),
    description:  z.string(),
    amount:       z.number().positive(),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase.from('expenses').insert(body).select('*, expense_categories(name, icon, color)').single();
  if (error) throw error;
  return res.status(201).json(data);
});

// PUT /api/expenses/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('expenses').update(req.body).eq('id', Number(req.params.id)).select().single();
  if (error || !data) return res.status(404).json({ error: 'Gasto no encontrado' });
  return res.json(data);
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await supabase.from('expenses').delete().eq('id', Number(req.params.id));
  return res.json({ ok: true });
});

export default router;
