import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { id } = req.query;
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
