import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name, email, password, avatar, admin_id } = req.body;
    try {
      const [user] = await sql`SELECT name FROM users WHERE id = ${id}`;
      await sql`
        UPDATE users
        SET name = COALESCE(${name}, name),
            email = COALESCE(${email}, email),
            password = COALESCE(${password}, password),
            avatar = COALESCE(${avatar}, avatar)
        WHERE id = ${id}
      `;

      if (admin_id && user) {
        await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${admin_id}, 'تعديل مستخدم', ${`تم تعديل بيانات المستخدم: ${user.name}`})`;
      }

      return res.json({ success: true });
    } catch {
      return res.status(400).json({ error: 'Email already exists' });
    }
  }

  if (req.method === 'DELETE') {
    const { admin_id } = req.body;
    if (id === '1') return res.status(403).json({ error: 'لا يمكن حذف مدير النظام الرئيسي' });

    const [user] = await sql`SELECT name FROM users WHERE id = ${id}`;
    await sql`DELETE FROM users WHERE id = ${id}`;

    if (admin_id && user) {
      await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${admin_id}, 'حذف مستخدم', ${`تم حذف المستخدم: ${user.name}`})`;
    }

    return res.json({ success: true });
  }

  return res.status(405).end();
}
