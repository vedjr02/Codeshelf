/**
 * Resets one account's password.
 *
 *   node scripts/reset-password.mjs <email> '<new password>'
 *
 * The hash is produced exactly as the register route produces it, so the login
 * form accepts the new password with no other change. Run it from the project
 * root — it resolves bcryptjs and the Prisma client from ./node_modules, and
 * reads DATABASE_URL from .env like the app does.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node scripts/reset-password.mjs <email> '<new password>'");
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 10) },
    select: { email: true },
  });
  // Existing sessions stay valid; they are rows in Session, not derived from
  // the password. Delete them too if a reset should sign other devices out.
  console.log(`Password reset for ${user.email}. Existing sessions still valid.`);
} catch (err) {
  console.error(err.code === 'P2025' ? `No account with email ${email}.` : err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
