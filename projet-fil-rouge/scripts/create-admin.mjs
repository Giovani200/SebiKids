/**
 * Grants the admin role to an existing account.
 *
 * Usage: node scripts/create-admin.mjs <email>
 *
 * Replaces the former /api/admin/promote route: granting admin rights now
 * requires the database credentials, not an HTTP request.
 */
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import mongoose from 'mongoose';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: node scripts/create-admin.mjs <email>');
    process.exitCode = 1;
    return;
  }

  nextEnv.loadEnvConfig(projectRoot);
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'sebie_db' });

  const { matchedCount } = await mongoose.connection
    .collection('users')
    .updateOne({ email }, { $set: { isAdmin: true } });

  if (matchedCount === 0) {
    console.error(`No account found for ${email}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${email} is now an admin`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
