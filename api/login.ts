import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  const [user] = await sql`
    SELECT id, name, email, role, permissions, avatar
    FROM users WHERE email = ${email} AND password = ${password}
  `;

  if (user) {
    res.json({
      ...user,
      permissions: JSON.parse((user.permissions as string) || '[]'),
    });
  } else {
    res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }
}
