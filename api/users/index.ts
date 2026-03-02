import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const users = await sql`SELECT id, name, email, role, permissions, avatar FROM users`;
    return res.json(users);
  }

  if (req.method === 'POST') {
    const { name, email, password, role, permissions, admin_id } = req.body;
    try {
      const [result] = await sql`
        INSERT INTO users (name, email, password, role, permissions)
        VALUES (${name}, ${email}, ${password}, ${role}, ${JSON.stringify(permissions)})
        RETURNING id
      `;

      if (admin_id) {
        await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${admin_id}, 'إضافة مستخدم', ${`تم إضافة المستخدم الجديد: ${name}`})`;
      }

      return res.json({ id: result.id });
    } catch {
      return res.status(400).json({ error: 'Email already exists' });
    }
  }

  return res.status(405).end();
}
