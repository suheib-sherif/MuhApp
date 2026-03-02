import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const logs = await sql`
    SELECT a.*, u.name as user_name
    FROM audit_trail a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 100
  `;
  res.json(logs);
}
