import mongoose from 'mongoose';
import { User } from '../src/lib/db/models/user.model';
import { connectToDatabase } from '../src/lib/db/connection';
import { hashPassword } from '../src/lib/utils/crypto';
import { loadEnvConfig } from '@next/env';

// Load env variables
loadEnvConfig(process.cwd());

async function createUser() {
  const args = process.argv.slice(2);
  const [staffIdInput, name, role, password, superAdminSecret] = args;

  if (!staffIdInput || !name || !role || !password) {
    console.log('📖 Usage: npx tsx scripts/create-user.ts <STAFF_ID> <NAME> <ROLE> <PASSWORD> [SUPER_ADMIN_SECRET]');
    console.log('Roles allowed: admin, counter, gate');
    console.log('Example (Regular Admin): npx tsx scripts/create-user.ts ADM-002 "John Doe" admin mypassword123');
    console.log('Example (Super Admin):   npx tsx scripts/create-user.ts ADM-004 "John Doe" admin mypassword123 superadminsecret123');
    process.exit(0);
  }

  const validRoles = ['admin', 'counter', 'gate'];
  if (!validRoles.includes(role.toLowerCase())) {
    console.error(`❌ Invalid role: "${role}". Must be one of: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined in .env.local');
  }

  console.log('👤 Connecting to MongoDB...');
  await connectToDatabase();

  const staffId = staffIdInput.trim().toUpperCase();
  const existing = await User.findOne({ staffId });

  if (existing) {
    console.error(`❌ User with Staff ID "${staffId}" already exists.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Determine if super admin status is requested and valid
  let isSuperAdmin = false;
  if (role.toLowerCase() === 'admin' && superAdminSecret) {
    const envSecret = process.env.SUPER_ADMIN_SECRET;
    if (!envSecret) {
      console.error('❌ SUPER_ADMIN_SECRET is not defined in your environment variables.');
      await mongoose.disconnect();
      process.exit(1);
    }
    if (superAdminSecret !== envSecret) {
      console.error('❌ Invalid Super Admin Activation Secret.');
      await mongoose.disconnect();
      process.exit(1);
    }
    isSuperAdmin = true;
  }

  console.log(`🔐 Hashing password...`);
  const passwordHash = await hashPassword(password);

  const selfId = new mongoose.Types.ObjectId();

  await User.create({
    _id: selfId,
    staffId,
    name,
    phoneNumber: '98765' + Math.floor(10000 + Math.random() * 90000),
    passwordHash,
    role: isSuperAdmin ? 'super_admin' : role.toLowerCase(),
    assignedExhibitions: [],
    isActive: true,
    createdBy: selfId, // self-created or admin-created
  });

  console.log(`✅ User successfully created!`);
  console.log(`   Name:        ${name}`);
  console.log(`   Staff ID:    ${staffId}`);
  console.log(`   Role:        ${role} ${isSuperAdmin ? '(Super Admin ✨)' : ''}`);
  console.log(`   Password:    ${password}`);

  await mongoose.disconnect();
}

createUser().catch((error) => {
  console.error('❌ Failed to create user:', error);
  process.exit(1);
});
