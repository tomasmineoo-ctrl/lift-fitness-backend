import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/admin/log — historial de acciones del gym actual
router.get('/log', authenticate, async (req: Request, res: Response) => {
  try {
    const gymId = req.user!.gym_id;
    const { limit = '100', offset = '0' } = req.query as Record<string, string>;

    const pageSize   = Math.min(200, parseInt(limit) || 100);
    const pageOffset = Math.max(0, parseInt(offset) || 0);

    const { data, count, error } = await supabase
      .from('admin_log')
      .select('*', { count: 'exact' })
      .eq('gym_id', gymId)
      .order('log_timestamp', { ascending: false })
      .range(pageOffset, pageOffset + pageSize - 1);

    if (error) throw error;

    return res.json({
      data: data || [],
      total: count || 0,
      page: Math.floor(pageOffset / pageSize) + 1,
      pageSize,
    });
  } catch (error) {
    console.error('Audit log error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
