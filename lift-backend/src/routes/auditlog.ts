import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/admin/log — obtener el historial de acciones
router.get('/log', authorize('admin', 'reception'), async (req: Request, res: Response) => {
  const { limit = '100', offset = '0' } = req.query as Record<string, string>;

  const pageSize = Math.min(200, parseInt(limit) || 100);
  const pageOffset = Math.max(0, parseInt(offset) || 0);

  const { data, count, error } = await supabase
    .from('admin_log')
    .select('*', { count: 'exact' })
    .order('log_timestamp', { ascending: false })
    .range(pageOffset, pageOffset + pageSize - 1);

  if (error) throw error;

  return res.json({
    data: data || [],
    total: count || 0,
    page: Math.floor(pageOffset / pageSize) + 1,
    pageSize,
  });
});

export default router;
