import mongoose from 'mongoose';
import { User } from '../src/lib/db/models/user.model';
import { connectToDatabase } from '../src/lib/db/connection';
import { hashPassword } from '../src/lib/utils/crypto';
import { loadEnvConfig } from '@next/env';

// Load env variables
loadEnvConfig(process.cwd());

async function resetPassword() {
  const args = process.argv.slice(2);
  const [staffIdInput, newPassword] = args;

  if (!staffIdInput || !newPassword) {
    console.log('📖 Usage: npx tsx scripts/reset-password.ts <STAFF_ID> <NEW_PASSWORD>');
    console.log('Example: npx tsx scripts/reset-password.ts ADM-001 mynewsecurepassword');
    process.exit(0);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined in .env.local');
  }

  console.log('👤 Connecting to MongoDB...');
  await connectToDatabase();

  const staffId = staffIdInput.trim().toUpperCase();
  const user = await User.findOne({ staffId });

  if (!user) {
    console.error(`❌ User with Staff ID "${staffId}" not found in database.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`🔐 Hashing new password for ${user.name} (${staffId})...`);
  const passwordHash = await hashPassword(newPassword);

  user.passwordHash = passwordHash;
  await user.save();

  console.log(`✅ Password updated successfully for user ${user.name} (${staffId})!`);
  
  await mongoose.disconnect();
}

resetPassword().catch((error) => {
  console.error('❌ Failed to reset password:', error);
  process.exit(1);
});
