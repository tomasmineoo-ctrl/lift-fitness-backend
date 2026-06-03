// Gestión de gimnasios (multi-tenant)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/gyms — lista todos los gyms (solo superadmin / admin)
router.get('/', authenticate, authorize('admin'), async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('gyms')
    .select('id, slug, name, active, created_at')
    .order('name');
  if (error) throw error;
  return res.json(data || []);
});

// GET /api/gyms/:slug — info pública de un gym (no requiere auth)
router.get('/:slug', async (req: Request, res: Response) => {
  const { data } = await supabase
    .from('gyms')
    .select('id, slug, name, active')
    .eq('slug', req.params.slug)
    .single();
  if (!data) return res.status(404).json({ error: 'Gimnasio no encontrado' });
  return res.json(data);
});

// POST /api/gyms — crear nuevo gimnasio
// En producción esto debería estar protegido por un super-admin token aparte.
// Por ahora lo protegemos con la misma clave ADMIN_SECRET del env.
router.post('/', async (req: Request, res: Response) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const schema = z.object({
    slug: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
    name: z.string().min(2),
  });
  const { slug, name } = schema.parse(req.body);

  const { data, error } = await supabase
    .from('gyms')
    .insert({ slug, name })
    .select('id, slug, name, active, created_at')
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Slug ya existe' });
    throw error;
  }

  return res.status(201).json(data);
});

// PATCH /api/gyms/:id — activar/desactivar o renombrar
router.patch('/:id', async (req: Request, res: Response) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const schema = z.object({
    name:   z.string().min(2).optional(),
    active: z.boolean().optional(),
  });
  const body = schema.parse(req.body);

  const { data, error } = await supabase
    .from('gyms')
    .update(body)
    .eq('id', req.params.id)
    .select('id, slug, name, active')
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Gimnasio no encontrado' });
  return res.json(data);
});

export default router;
