// Tablas: "trainer_students" (user_id bigint), "physical_progress" (user_id bigint)
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('admin', 'trainer'));

// GET /api/trainer/students — alumnos del entrenador actual
router.get('/students', async (req: Request, res: Response) => {
  const trainerId = req.user!.id;
  const { data, error } = await supabase
    .from('trainer_students')
    .select(`*, users(id, name, email, plan, status)`)
    .eq('trainer_id', trainerId)
    .order('created_at');
  if (error) throw error;
  return res.json(data || []);
});

// POST /api/trainer/students — asignar alumno
router.post('/students', async (req: Request, res: Response) => {
  const schema = z.object({
    user_id:       z.number().int(),
    goal:          z.string().optional(),
    level:         z.string().optional(),
    notes:         z.string().optional(),
    custom_fields: z.array(z.object({ key: z.string(), value: z.string() })).optional().default([]),
  });
  const body = schema.parse(req.body);
  const { data, error } = await supabase
    .from('trainer_students')
    .insert({ trainer_id: req.user!.id, ...body })
    .select(`*, users(id, name, email, plan)`)
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'El alumno ya está asignado a este entrenador' });
    throw error;
  }
  return res.status(201).json(data);
});

// PUT /api/trainer/students/:studentId
router.put('/students/:studentId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('trainer_students')
    .update(req.body)
    .eq('id', req.params.studentId)
    .eq('trainer_id', req.user!.id)
    .select()
    .single();
  if (error || !data) return res.status(404).json({ error: 'Alumno no encontrado' });
  return res.json(data);
});

// DELETE /api/trainer/students/:studentId
router.delete('/students/:studentId', async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('trainer_students')
    .delete()
    .eq('id', req.params.studentId)
    .eq('trainer_id', req.user!.id);
  if (error) throw error;
  return res.json({ ok: true });
});

// GET /api/trainer/students/:userId/progress
router.get('/students/:userId/progress', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('physical_progress')
    .select('*')
    .eq('user_id', Number(req.params.userId))
    .order('date', { ascending: true });
  if (error) throw error;
  return res.json(data || []);
});

// POST /api/trainer/students/:userId/progress
router.post('/students/:userId/progress', async (req: Request, res: Response) => {
  const schema = z.object({
    date:     z.string(),
    weight:   z.number().optional(),
    body_fat: z.number().optional(),
    muscle:   z.number().optional(),
    waist:    z.number().optional(),
    chest:    z.number().optional(),
    arm:      z.number().optional(),
    leg:      z.number().optional(),
    notes:    z.string().optional(),
  });
  const body = schema.parse(req.body);
  const userId = Number(req.params.userId);

  const { data, error } = await supabase
    .from('physical_progress')
    .insert({ user_id: userId, trainer_id: req.user!.id, ...body })
    .select()
    .single();
  if (error) throw error;

  // Puntos por evaluación física
  const { data: member } = await supabase.from('users').select('name').eq('id', userId).single();
  await supabase.from('points_log').insert({ user_id: userId, user_name: member?.name, action: 'evaluacionFisica', points: 30, detail: 'Evaluación física registrada' });

  return res.status(201).json(data);
});

// PUT /api/trainer/students/:userId/progress/:progressId
router.put('/students/:userId/progress/:progressId', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('physical_progress')
    .update(req.body)
    .eq('id', req.params.progressId)
    .eq('user_id', Number(req.params.userId))
    .select()
    .single();
  if (error || !data) return res.status(404).json({ error: 'Registro no encontrado' });
  return res.json(data);
});

export default router;
