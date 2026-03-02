import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  console.log('Seeding database...');

  // Admin user
  const [existingAdmin] = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  if (!existingAdmin) {
    await sql`
      INSERT INTO users (name, email, password, role, permissions)
      VALUES ('مدير النظام', 'admin@smart-acc.com', 'admin123', 'admin', ${JSON.stringify(["all"])})
    `;
    console.log('Admin user created');
  }

  // Default expense categories
  const [catCount] = await sql`SELECT COUNT(*) as count FROM expense_categories`;
  if (Number(catCount.count) === 0) {
    const cats = ['رواتب', 'إيجار', 'مشتريات', 'صيانة', 'أخرى', 'قرطاسية', 'ضيافة', 'سفر', 'تسويق'];
    for (const name of cats) {
      await sql`INSERT INTO expense_categories (name) VALUES (${name})`;
    }
    console.log('Default categories created');
  }

  // Seed extra users if only admin exists
  const [userCount] = await sql`SELECT COUNT(*) as count FROM users`;
  if (Number(userCount.count) === 1) {
    const seedUsers = [
      { name: 'أحمد محمد', email: 'ahmed@smart-acc.com', password: 'user123', role: 'user', permissions: JSON.stringify(["view_reports", "add_transactions"]) },
      { name: 'سارة علي', email: 'sara@smart-acc.com', password: 'user123', role: 'user', permissions: JSON.stringify(["view_reports"]) },
      { name: 'خالد محمود', email: 'khaled@smart-acc.com', password: 'user123', role: 'admin', permissions: JSON.stringify(["all"]) },
    ];
    for (const u of seedUsers) {
      await sql`INSERT INTO users (name, email, password, role, permissions) VALUES (${u.name}, ${u.email}, ${u.password}, ${u.role}, ${u.permissions})`;
    }
    console.log('Seed users created');
  }

  // Seed transactions if empty
  const [transCount] = await sql`SELECT COUNT(*) as count FROM transactions`;
  if (Number(transCount.count) === 0) {
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(now.getMonth() - 1);

    // 1. Initial Revenue
    await sql`
      INSERT INTO transactions (type, code, amount, description, user_id, date)
      VALUES ('revenue', 'RV-0001', 50000, 'رصيد افتتاحي للشركة', 1, ${lastMonth.toISOString()})
    `;

    // 2. Petty Cash Allocations
    const [pc1] = await sql`
      INSERT INTO transactions (type, code, amount, description, user_id, expiry_date, date)
      VALUES ('petty_cash', 'PC-0001', 5000, 'عهدة مكتب طرابلس', 2, ${new Date(now.getTime() + 7*24*60*60*1000).toISOString()}, ${lastMonth.toISOString()})
      RETURNING id
    `;

    await sql`
      INSERT INTO transactions (type, code, amount, description, user_id, expiry_date, date)
      VALUES ('petty_cash', 'PC-0002', 2000, 'عهدة مشتريات عاجلة', 3, ${new Date(now.getTime() + 2*24*60*60*1000).toISOString()}, ${now.toISOString()})
    `;

    // 3. Expenses linked to PC-0001
    await sql`
      INSERT INTO transactions (type, code, amount, description, user_id, parent_id, category_id, date)
      VALUES ('expense', 'EX-0001', 450, 'شراء أحبار طابعات', 2, ${pc1.id}, 6, ${now.toISOString()})
    `;

    await sql`
      INSERT INTO transactions (type, code, amount, description, user_id, parent_id, category_id, date)
      VALUES ('expense', 'EX-0002', 120, 'ضيافة اجتماع مجلس الإدارة', 2, ${pc1.id}, 7, ${now.toISOString()})
    `;

    console.log('Seed transactions created');
  }

  console.log('Seeding complete!');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
