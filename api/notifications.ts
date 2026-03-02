import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { user_id } = req.query;

  // Check for expiring petty cash (within 3 days)
  const expiringSoon = await sql`
    SELECT t.*, u.name as user_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE t.type = 'petty_cash'
      AND t.status = 'pending'
      AND t.expiry_date IS NOT NULL
      AND t.expiry_date <= NOW() + INTERVAL '3 days'
  `;

  for (const t of expiringSoon) {
    const message = `تنبيه: العهدة ${t.code} ستنتهي في ${t.expiry_date}`;
    const [exists] = await sql`SELECT id FROM notifications WHERE user_id = ${t.user_id} AND message = ${message}`;
    if (!exists) {
      await sql`INSERT INTO notifications (user_id, message, type) VALUES (${t.user_id}, ${message}, 'warning')`;

      // Notify admins
      const admins = await sql`SELECT id FROM users WHERE role = 'admin'`;
      for (const admin of admins) {
        await sql`INSERT INTO notifications (user_id, message, type) VALUES (${admin.id}, ${`تنبيه للمدير: العهدة ${t.code} للمستخدم ${t.user_name} ستنتهي قريباً`}, 'warning')`;
      }
    }
  }

  const notifications = await sql`
    SELECT * FROM notifications WHERE user_id = ${user_id} ORDER BY created_at DESC LIMIT 20
  `;
  res.json(notifications);
}
