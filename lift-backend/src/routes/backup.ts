import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

const TABLES = [
  'users','staff','classes','class_enrollments','payments',
  'expenses','expense_categories','access_log','messages','admin_log',
  'announcements','points_log','pay_history','cafeteria_menu',
  'cafeteria_orders','community_posts','post_likes','post_comments',
  'community_challenges','challenge_participants','machines','saved_cards',
  'user_notifications','redemptions_log','points_config','discount_codes',
  'referrals','trainer_students','physical_progress','nutri_clients',
  'nutri_appointments','surveys','chat_messages','shop_orders',
  'shop_products','exercises','staff',
];

export async function generateBackup(): Promise<Record<string, unknown>> {
  const backup: Record<string, unknown> = {
    _meta: {
      version:      '1.0',
      generated_at: new Date().toISOString(),
      tables:       TABLES,
    },
  };

  const uniqueTables = [...new Set(TABLES)];
  for (const table of uniqueTables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      backup[table] = error ? [] : (data ?? []);
    } catch {
      backup[table] = [];
    }
  }
  return backup;
}

export async function saveBackupToStorage(): Promise<string> {
  const backup  = await generateBackup();
  const ts      = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `backup_${ts}.json`;
  const content = JSON.stringify(backup, null, 2);

  const { error } = await supabase.storage
    .from('backups')
    .upload(filename, Buffer.from(content, 'utf-8'), {
      contentType: 'application/json',
      upsert: false,
    });

  if (error) throw error;
  return filename;
}

// POST /api/admin/backup/download  — descarga directa al browser
router.post('/download', async (_req: Request, res: Response) => {
  const backup   = await generateBackup();
  const filename = `backup_ctrlgym_${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.json(backup);
});

// POST /api/admin/backup/save  — guarda en Supabase Storage
router.post('/save', async (_req: Request, res: Response) => {
  const filename = await saveBackupToStorage();
  return res.json({ ok: true, filename });
});

// GET /api/admin/backup/list  — lista los backups guardados
router.get('/list', async (_req: Request, res: Response) => {
  const { data, error } = await supabase.storage
    .from('backups')
    .list('', { limit: 30, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw error;
  return res.json(data ?? []);
});

// GET /api/admin/backup/fetch/:filename  — descarga un backup de Storage
router.get('/fetch/:filename', async (req: Request, res: Response) => {
  const { data, error } = await supabase.storage
    .from('backups')
    .download(req.params.filename);
  if (error || !data) return res.status(404).json({ error: 'Backup no encontrado' });
  const text = await data.text();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
  return res.send(text);
});

export default router;
