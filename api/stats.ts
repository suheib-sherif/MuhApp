import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const [[{ total: totalRevenue }], [{ total: totalExpense }], [{ total: activePettyCash }], [{ total: pettyCashSpent }], [{ total: pettyCashAdded }]] = await Promise.all([
    sql`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'revenue' AND parent_id IS NULL`,
    sql`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND parent_id IS NULL`,
    sql`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'petty_cash' AND status = 'pending'`,
    sql`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND parent_id IS NOT NULL`,
    sql`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'revenue' AND parent_id IS NOT NULL`,
  ]);

  const revenue = Number(totalRevenue);
  const expense = Number(totalExpense);
  const pc = Number(activePettyCash);
  const spent = Number(pettyCashSpent);
  const added = Number(pettyCashAdded);

  res.json({
    revenue,
    expense,
    pettyCash: pc + added - spent,
    balance: (revenue + pc + added) - (expense + spent),
    netProfit: revenue - expense,
  });
}
