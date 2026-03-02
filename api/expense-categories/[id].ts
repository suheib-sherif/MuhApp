import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name, icon, color, admin_id } = req.body;
    try {
      await sql`UPDATE expense_categories SET name = ${name}, icon = ${icon}, color = ${color} WHERE id = ${id}`;

      if (admin_id) {
        await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${admin_id}, 'تعديل تصنيف', ${`تم تعديل التصنيف: ${name}`})`;
      }

      return res.json({ success: true });
    } catch {
      return res.status(400).json({ error: 'خطأ في تعديل التصنيف' });
    }
  }

  if (req.method === 'DELETE') {
    const { admin_id } = req.body;
    const [category] = await sql`SELECT name FROM expense_categories WHERE id = ${id}`;

    const [inUse] = await sql`SELECT COUNT(*) as count FROM transactions WHERE category_id = ${id}`;
    if (Number(inUse.count) > 0) {
      return res.status(400).json({ error: 'لا يمكن حذف التصنيف لأنه مستخدم في عمليات مالية' });
    }

    await sql`DELETE FROM expense_categories WHERE id = ${id}`;

    if (admin_id && category) {
      await sql`INSERT INTO audit_trail (user_id, action, details) VALUES (${admin_id}, 'حذف تصنيف', ${`تم حذف التصنيف: ${category.name}`})`;
    }

    return res.json({ success: true });
  }

  return res.status(405).end();
}
