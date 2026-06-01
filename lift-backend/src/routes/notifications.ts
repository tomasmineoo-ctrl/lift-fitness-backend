// Tabla: "user_notifications" (user_id bigint, title, body, notification_type, read)
import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== 'user') return res.status(403).json({ error: 'Solo para socios' });

  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', Number(user.id))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return res.json(data || []);
});

// GET /api/notifications/:userId — admin puede ver notifs de cualquier socio
router.get('/:userId', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { data } = await supabase.from('user_notifications').select('*').eq('user_id', Number(req.params.userId)).order('created_at', { ascending: false });
  return res.json(data || []);
});

// PUT /api/notifications/read-all/me  ← MUST be before /:id/read to avoid catch-all
router.put('/read-all/me', async (req: Request, res: Response) => {
  if (req.user!.role !== 'user') return res.status(403).json({ error: 'Solo para socios' });
  await supabase.from('user_notifications').update({ read: true }).eq('user_id', Number(req.user!.id));
  return res.json({ ok: true });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req: Request, res: Response) => {
  await supabase.from('user_notifications').update({ read: true }).eq('id', Number(req.params.id));
  return res.json({ ok: true });
});

// POST /api/notifications/check — chequeo automático de notificaciones
router.post('/check', authorize('admin'), async (_req: Request, res: Response) => {
  const { data: users } = await supabase.from('users').select('id, name, last_payment, dob, insc_date, plan');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const inserted: string[] = [];

  for (const u of users || []) {
    // 1. Vencimiento de cuota
    if (u.last_payment) {
      const diff = Math.floor((today.getTime() - new Date(u.last_payment).getTime()) / 86400000);
      if (diff >= 28 && diff <= 30) {
        const exists = await supabase.from('user_notifications').select('id').eq('user_id', u.id).eq('notification_type', 'renovacion').gte('created_at', todayStr).single();
        if (!exists.data) {
          await supabase.from('user_notifications').insert({ user_id: u.id, notification_type: 'renovacion', title: 'Tu cuota vence pronto', body: `Tu plan ${u.plan} vence en ${30 - diff} días.` });
          inserted.push(`renovacion-${u.id}`);
        }
      }
    }

    // 2. Cumpleaños
    if (u.dob) {
      const dob = new Date(u.dob);
      if (dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
        const exists = await supabase.from('user_notifications').select('id').eq('user_id', u.id).eq('notification_type', 'cumple').gte('created_at', todayStr).single();
        if (!exists.data) {
          await supabase.from('user_notifications').insert({ user_id: u.id, notification_type: 'cumple', title: '¡Feliz cumpleaños!', body: '¡Hoy es tu día! LIFT te regala 100 puntos de regalo.' });
          await supabase.from('points_log').insert({ user_id: u.id, user_name: u.name, action: 'cumpleanios', points: 100, detail: 'Cumpleaños' });
          inserted.push(`cumple-${u.id}`);
        }
      }
    }

    // 3. Hitos de permanencia
    if (u.insc_date) {
      const months = Math.floor((today.getTime() - new Date(u.insc_date).getTime()) / (86400000 * 30));
      for (const hito of [3, 6, 12]) {
        if (months === hito) {
          const tipo = `hito${hito}`;
          const exists = await supabase.from('user_notifications').select('id').eq('user_id', u.id).eq('notification_type', tipo).single();
          if (!exists.data) {
            await supabase.from('user_notifications').insert({ user_id: u.id, notification_type: tipo, title: `¡${hito} meses en LIFT!`, body: `¡Felicitaciones! Llevás ${hito} meses con nosotros.` });
            inserted.push(`${tipo}-${u.id}`);
          }
        }
      }
    }
  }

  return res.json({ ok: true, inserted: inserted.length, detail: inserted });
});

export default router;
