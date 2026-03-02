import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') return res.status(405).end();

  const { id } = req.query;
  const { status, expiry_date } = req.body;

  if (expiry_date) {
    await sql`UPDATE transactions SET status = ${status}, expiry_date = ${expiry_date} WHERE id = ${id}`;
  } else {
    await sql`UPDATE transactions SET status = ${status} WHERE id = ${id}`;
  }

  res.json({ success: true });
}
