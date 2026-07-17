import mongoose from 'mongoose';
import { User } from '../src/lib/db/models/user.model';
import { connectToDatabase } from '../src/lib/db/connection';
import { hashPassword } from '../src/lib/utils/crypto';
import { loadEnvConfig } from '@next/env';

// Load env variables
loadEnvConfig(process.cwd());

async function createAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined in .env.local');
  }

  console.log('👤 Connecting to MongoDB...');
  await connectToDatabase();

  const adminId = 'ADM-001';
  const existing = await User.findOne({ staffId: adminId });

  if (existing) {
    console.log('ℹ️ Admin user ADM-001 already exists in database.');
    await mongoose.disconnect();
    return;
  }

  console.log('🔐 Hashing admin password...');
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await hashPassword(password);

  const selfId = new mongoose.Types.ObjectId();

  await User.create({
    _id: selfId,
    staffId: adminId,
    name: 'Soham Admin',
    email: 'admin@exora.com',
    passwordHash,
    role: 'admin',
    assignedExhibitions: [],
    isActive: true,
    createdBy: selfId, // self-created
  });

  console.log(`✅ Admin user successfully created!`);
  console.log(`   Staff ID: ${adminId}`);
  console.log(`   Password: ${password}`);

  await mongoose.disconnect();
}

createAdmin().catch((error) => {
  console.error('❌ Failed to create admin:', error);
  process.exit(1);
});
