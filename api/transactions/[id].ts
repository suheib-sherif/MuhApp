import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { amount, description, date, expiry_date, status, category_id, user_id, admin_id } = req.body;

    const [transaction] = await sql`SELECT code FROM transactions WHERE id = ${id}`;

    await sql`
      UPDATE transactions
      SET amount = COALESCE(${amount ?? null}, amount),
          description = COALESCE(${description ?? null}, description),
          date = COALESCE(${date ?? null}, date),
          expiry_date = COALESCE(${expiry_date ?? null}, expiry_date),
          status = COALESCE(${status ?? null}, status),
          category_id = COALESCE(${category_id ?? null}, category_id),
          user_id = COALESCE(${user_id ?? null}, user_id)
      WHERE id = ${id}
    `;

    if (transaction) {
      await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${admin_id || user_id}, 'تعديل عملية', ${`تم تعديل العملية ${transaction.code}`})`;
    }

    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { user_id } = req.body;
    const [trans] = await sql`SELECT code FROM transactions WHERE id = ${id}`;
    await sql`DELETE FROM transactions WHERE id = ${id}`;

    if (trans) {
      await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${user_id || 1}, 'حذف عملية', ${`تم حذف العملية ${trans.code}`})`;
    }

    return res.json({ success: true });
  }

  return res.status(405).end();
}
