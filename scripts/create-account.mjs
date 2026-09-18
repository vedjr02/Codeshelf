/**
 * Creates or updates one account in whatever database DATABASE_URL points at.
 *
 *   node scripts/create-account.mjs <email> '<password>' [name]
 *
 * This is how the hosted instance gets its account. Registration closes as
 * soon as a user row exists, so seeding the account before anyone visits the
 * URL is also what keeps a stranger from claiming the deployment.
 *
 * No credential is stored in this file. Both are arguments, and the password
 * is written only as a bcrypt hash — the same hash the register route writes.
 *
 * Run it twice with different passwords and the second wins, so this doubles
 * as the reset for the hosted account.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node scripts/create-account.mjs <email> '<password>' [name]");
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Prefix the command with it, or source .env first.');
  process.exit(1);
}

// Show which database is about to be written to, without printing the password
// in the connection string.
const host = process.env.DATABASE_URL.replace(/^.*@/, '').replace(/[/?].*$/, '');
console.log(`Target: ${host}`);

const prisma = new PrismaClient();
try {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: name ?? email.split('@')[0] },
    select: { email: true, name: true, createdAt: true },
  });

  const total = await prisma.user.count();
  console.log(`Account ready: ${user.email} (${user.name})`);
  console.log(`Users in this database: ${total}. Registration is ${total === 0 ? 'open' : 'closed'}.`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
