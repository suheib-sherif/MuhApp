import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const categories = await sql`SELECT * FROM expense_categories`;
    return res.json(categories);
  }

  if (req.method === 'POST') {
    const { name, icon, color, admin_id } = req.body;
    try {
      const [result] = await sql`
        INSERT INTO expense_categories (name, icon, color)
        VALUES (${name}, ${icon || 'Tag'}, ${color || '#6366f1'})
        RETURNING id
      `;

      if (admin_id) {
        await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${admin_id}, 'إضافة تصنيف', ${`تم إضافة تصنيف جديد: ${name}`})`;
      }

      return res.json({ id: result.id });
    } catch {
      return res.status(400).json({ error: 'التصنيف موجود مسبقاً' });
    }
  }

  return res.status(405).end();
}
