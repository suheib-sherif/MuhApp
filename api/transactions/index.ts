import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { type, startDate, endDate, user_id, expiryStartDate, expiryEndDate } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (type && type !== 'all') {
      conditions.push(`t.type = $${paramIndex++}`);
      params.push(type);
    }
    if (startDate) {
      conditions.push(`t.date >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`t.date <= $${paramIndex++}`);
      params.push(endDate);
    }
    if (expiryStartDate) {
      conditions.push(`t.expiry_date >= $${paramIndex++}`);
      params.push(expiryStartDate);
    }
    if (expiryEndDate) {
      conditions.push(`t.expiry_date <= $${paramIndex++}`);
      params.push(expiryEndDate);
    }
    if (user_id) {
      conditions.push(`t.user_id = $${paramIndex++}`);
      params.push(user_id);
    }

    const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT t.*, u.name as user_name, c.name as category_name,
             (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE parent_id = t.id AND type = 'revenue') as total_revenue,
             (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE parent_id = t.id AND type = 'expense') as total_expense
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN expense_categories c ON t.category_id = c.id
      WHERE 1=1 ${where}
      ORDER BY t.date DESC
    `;

    const transactions = await sql(query, params);

    const enriched = transactions.map(t => {
      if (t.type === 'petty_cash') {
        (t as any).remaining_balance = Number(t.amount) + Number(t.total_revenue || 0) - Number(t.total_expense || 0);
      }
      return t;
    });

    return res.json(enriched);
  }

  if (req.method === 'POST') {
    const { type, amount, description, user_id, expiry_date, attachment_url, parent_id, category_id, date, admin_id } = req.body;

    if ((type === 'expense' || type === 'revenue') && !parent_id) {
      return res.status(400).json({ error: 'يجب ربط المصروف أو الإيراد بعهدة مالية' });
    }

    const prefix = type === 'petty_cash' ? 'PC' : type === 'expense' ? 'EX' : 'RV';
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM transactions WHERE type = ${type}`;
    const code = `${prefix}-${(Number(count) + 1).toString().padStart(4, '0')}`;

    const [result] = await sql`
      INSERT INTO transactions (type, code, amount, description, user_id, expiry_date, attachment_url, parent_id, category_id, date)
      VALUES (${type}, ${code}, ${amount}, ${description}, ${user_id}, ${expiry_date || null}, ${attachment_url || null}, ${parent_id || null}, ${category_id || null}, ${date || new Date().toISOString()})
      RETURNING id
    `;

    await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${admin_id || user_id}, 'إضافة عملية', ${`تم إضافة عملية ${code} بمبلغ ${amount}`})`;

    // Auto-closure logic for petty cash
    if (type === 'expense' && parent_id) {
      const [pc] = await sql`SELECT amount FROM transactions WHERE id = ${parent_id}`;
      const [{ total: spent }] = await sql`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE parent_id = ${parent_id} AND type = 'expense'`;
      const [{ total: added }] = await sql`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE parent_id = ${parent_id} AND type = 'revenue'`;
      const currentBalance = Number(pc.amount) + Number(added) - Number(spent);

      if (currentBalance <= 0) {
        await sql`UPDATE transactions SET status = 'closed' WHERE id = ${parent_id}`;
      }
    }

    return res.json({ id: result.id, code });
  }

  return res.status(405).end();
}
