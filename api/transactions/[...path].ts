import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const id = pathSegments[0];
  const action = pathSegments[1]; // undefined | 'linked' | 'status' | 'extend'

  // GET /api/transactions/:id/linked
  if (action === 'linked' && req.method === 'GET') {
    const linked = await sql`
      SELECT t.*, u.name as user_name, c.name as category_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN expense_categories c ON t.category_id = c.id
      WHERE t.parent_id = ${id}
      ORDER BY t.date DESC
    `;
    return res.json(linked);
  }

  // PATCH /api/transactions/:id/status
  if (action === 'status' && req.method === 'PATCH') {
    const { status, expiry_date } = req.body;
    if (expiry_date) {
      await sql`UPDATE transactions SET status = ${status}, expiry_date = ${expiry_date} WHERE id = ${id}`;
    } else {
      await sql`UPDATE transactions SET status = ${status} WHERE id = ${id}`;
    }
    return res.json({ success: true });
  }

  // POST /api/transactions/:id/extend
  if (action === 'extend' && req.method === 'POST') {
    const { days, user_role, user_id } = req.body;

    const [transaction] = await sql`SELECT * FROM transactions WHERE id = ${id}`;
    if (!transaction) return res.status(404).json({ error: 'العملية غير موجودة' });

    const currentExpiry = new Date((transaction.expiry_date as string) || (transaction.date as string));
    currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));
    const newExpiry = currentExpiry.toISOString();

    if (user_role === 'admin') {
      await sql`UPDATE transactions SET expiry_date = ${newExpiry}, status = 'extended' WHERE id = ${id}`;
      await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${user_id}, 'تمديد عهدة', ${`تم تمديد العهدة ${transaction.code} لمدة ${days} أيام`})`;
      await sql`INSERT INTO notifications (user_id, message, type) VALUES (${transaction.user_id}, ${`تم تمديد العهدة ${transaction.code} إلى ${new Date(newExpiry).toLocaleDateString('ar-LY')}`}, 'success')`;
      return res.json({ success: true, message: 'تم تمديد العهدة بنجاح' });
    } else {
      await sql`UPDATE transactions SET status = 'extension_pending' WHERE id = ${id}`;
      const admins = await sql`SELECT id FROM users WHERE role = 'admin'`;
      for (const admin of admins) {
        await sql`INSERT INTO notifications (user_id, message, type) VALUES (${admin.id}, ${`طلب تمديد للعهدة ${transaction.code} من قبل مستخدم`}, 'info')`;
      }
      return res.json({ success: true, message: 'تم إرسال طلب التمديد للمدير' });
    }
  }

  // No sub-action — handle /api/transactions/:id directly
  if (!action) {
    // PUT /api/transactions/:id
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

    // DELETE /api/transactions/:id
    if (req.method === 'DELETE') {
      const { user_id } = req.body;
      const [trans] = await sql`SELECT code FROM transactions WHERE id = ${id}`;
      await sql`DELETE FROM transactions WHERE id = ${id}`;

      if (trans) {
        await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${user_id || 1}, 'حذف عملية', ${`تم حذف العملية ${trans.code}`})`;
      }
      return res.json({ success: true });
    }
  }

  return res.status(405).end();
}
