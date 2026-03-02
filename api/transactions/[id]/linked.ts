import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  const linked = await sql`
    SELECT t.*, u.name as user_name, c.name as category_name
    FROM transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN expense_categories c ON t.category_id = c.id
    WHERE t.parent_id = ${id}
    ORDER BY t.date DESC
  `;
  res.json(linked);
}
