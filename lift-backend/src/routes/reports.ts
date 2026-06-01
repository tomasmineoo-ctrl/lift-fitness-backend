// Reportes usando schema real: users, payments (payment_date), expenses (expense_date), access_log (log_date, access_type)
import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('admin'));

// GET /api/reports/dashboard
router.get('/dashboard', async (_req: Request, res: Response) => {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const todayStr  = now.toISOString().slice(0, 10);

  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: blockedMembers },
    { count: frozenMembers },
    { data: paymentsThis },
    { data: paymentsLast },
    { count: todayEntries },
    { count: pendingShop },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('frozen', false),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('frozen', true),
    supabase.from('payments').select('amount').eq('status', 'approved').gte('payment_date', `${thisMonth}-01`).lte('payment_date', `${thisMonth}-31`),
    supabase.from('payments').select('amount').eq('status', 'approved').gte('payment_date', `${lastMonth}-01`).lte('payment_date', `${lastMonth}-31`),
    supabase.from('access_log').select('*', { count: 'exact', head: true }).eq('log_date', todayStr).eq('allowed', true).eq('access_type', 'entry'),
    supabase.from('shop_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const incomeThis = (paymentsThis || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const incomeLast = (paymentsLast || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0);
  const incomeDiff = incomeLast > 0 ? Math.round((incomeThis - incomeLast) / incomeLast * 100) : 0;

  return res.json({
    members:          { total: totalMembers, active: activeMembers, blocked: blockedMembers, frozen: frozenMembers },
    income:           { thisMonth: incomeThis, lastMonth: incomeLast, diff: incomeDiff },
    access:           { todayEntries },
    pendingShopOrders: pendingShop,
  });
});

// GET /api/reports/financial
router.get('/financial', async (req: Request, res: Response) => {
  const { year = new Date().getFullYear().toString() } = req.query as Record<string, string>;

  const incomeByMonth = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const m    = String(i + 1).padStart(2, '0');
      const from = `${year}-${m}-01`;
      const to   = new Date(parseInt(year), i + 1, 0).toISOString().slice(0, 10);
      const { data } = await supabase.from('payments').select('amount').eq('status', 'approved').gte('payment_date', from).lte('payment_date', to);
      return { month: i + 1, income: (data || []).reduce((s: number, p: { amount: number }) => s + p.amount, 0) };
    })
  );

  const expensesByMonth = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const m    = String(i + 1).padStart(2, '0');
      const from = `${year}-${m}-01`;
      const to   = new Date(parseInt(year), i + 1, 0).toISOString().slice(0, 10);
      const { data } = await supabase.from('expenses').select('amount').gte('expense_date', from).lte('expense_date', to);
      return { month: i + 1, expenses: (data || []).reduce((s: number, e: { amount: number }) => s + e.amount, 0) };
    })
  );

  const { data: expByCat } = await supabase.from('expenses')
    .select('category_id, amount, expense_categories(name, icon, color)')
    .gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`);

  const catMap = new Map<number, { name: string; icon: string; color: string; total: number }>();
  for (const e of expByCat || []) {
    const cat = (e as unknown as { expense_categories: { name: string; icon: string; color: string } | null }).expense_categories;
    if (!cat) continue;
    const cur = catMap.get(e.category_id) || { ...cat, total: 0 };
    cur.total += e.amount;
    catMap.set(e.category_id, cur);
  }

  const combined = incomeByMonth.map((inc, i) => ({
    month:    inc.month,
    income:   inc.income,
    expenses: expensesByMonth[i].expenses,
    profit:   inc.income - expensesByMonth[i].expenses,
  }));

  return res.json({
    byMonth:            combined,
    totalIncome:        combined.reduce((s, m) => s + m.income, 0),
    totalExpenses:      combined.reduce((s, m) => s + m.expenses, 0),
    totalProfit:        combined.reduce((s, m) => s + m.profit, 0),
    expensesByCategory: Array.from(catMap.values()).sort((a, b) => b.total - a.total),
  });
});

// GET /api/reports/members
router.get('/members', async (_req: Request, res: Response) => {
  const { data: members } = await supabase.from('users').select('plan, status, frozen, insc_date, last_payment');

  const byPlan:   Record<string, number> = { Bronce: 0, Plata: 0, Oro: 0, Diamante: 0 };
  const byStatus: Record<string, number> = { active: 0, inactive: 0, blocked: 0, frozen: 0 };

  for (const m of members || []) {
    if (m.plan && m.plan in byPlan) byPlan[m.plan]++;
    if (m.frozen) { byStatus.frozen++; continue; }
    if (m.status && m.status in byStatus) byStatus[m.status]++;
  }

  const now = new Date();
  const newByMonth = Array.from({ length: 6 }, (_, i) => {
    const d    = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = d.toISOString().slice(0, 7);
    const count = (members || []).filter((m) => m.insc_date?.startsWith(from)).length;
    return { month: d.toLocaleDateString('es-SV', { month: 'short', year: '2-digit' }), count };
  }).reverse();

  const retention = members && members.length
    ? Math.round((members.filter((m) =>
        m.last_payment && m.insc_date &&
        new Date(m.last_payment) >= new Date(now.getFullYear(), now.getMonth() - 1, 1)
      ).length / members.length) * 100)
    : 0;

  return res.json({ total: members?.length ?? 0, byPlan, byStatus, newByMonth, retentionRate: retention });
});

// GET /api/reports/attendance
router.get('/attendance', async (req: Request, res: Response) => {
  const { days = '30' } = req.query as Record<string, string>;
  const from = new Date(Date.now() - parseInt(days) * 86400000).toISOString().slice(0, 10);

  const { data } = await supabase.from('access_log').select('log_date, allowed').gte('log_date', from).eq('access_type', 'entry');

  const dateMap = new Map<string, { allowed: number; denied: number }>();
  for (const e of data || []) {
    const cur = dateMap.get(e.log_date) || { allowed: 0, denied: 0 };
    if (e.allowed) cur.allowed++; else cur.denied++;
    dateMap.set(e.log_date, cur);
  }

  return res.json(
    Array.from(dateMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))
  );
});

export default router;
