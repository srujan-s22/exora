import mongoose from 'mongoose';
import { User } from '../src/lib/db/models/user.model';
import { connectToDatabase } from '../src/lib/db/connection';
import { SUPER_ADMIN_PERMISSIONS, DEFAULT_ADMIN_PERMISSIONS } from '../src/lib/config/roles';
import { loadEnvConfig } from '@next/env';

// Load env variables
loadEnvConfig(process.cwd());

async function migrate() {
  console.log('🔌 Connecting to MongoDB...');
  await connectToDatabase();

  // Find all users
  const rawUsers = await User.find({});
  console.log(`🔍 Found ${rawUsers.length} total users to inspect.`);

  let updatedCount = 0;

  for (let i = 0; i < rawUsers.length; i++) {
    const userDoc = rawUsers[i];
    const rawUserObj = userDoc.toObject();

    let updated = false;

    // 1. Check for legacy isSuperAdmin property (which might not be in typescript interface anymore)
    const isLegacySuperAdmin = (rawUserObj as any).isSuperAdmin === true;

    if (isLegacySuperAdmin || userDoc.role === 'super_admin') {
      if (userDoc.role !== 'super_admin') {
        console.log(`🔑 Migrating User ${userDoc.staffId} (${userDoc.name}) from Legacy Super Admin to role: 'super_admin'`);
        userDoc.role = 'super_admin';
        updated = true;
      }
      userDoc.permissions = { ...SUPER_ADMIN_PERMISSIONS };
      updated = true;
    } else if (userDoc.role === 'admin') {
      // Ensure admin has standard permissions structure initialized
      const currentPerms = userDoc.permissions || {};
      userDoc.permissions = {
        ...DEFAULT_ADMIN_PERMISSIONS,
        ...currentPerms,
      };
      updated = true;
    } else {
      // Counter, Gate, Ride staff get default empty permissions
      userDoc.permissions = {
        ...DEFAULT_ADMIN_PERMISSIONS,
      };
      updated = true;
    }

    // 2. Ensure phoneNumber is present (defaulting to sequential placeholder if missing)
    if (!userDoc.phoneNumber) {
      const placeholderPhone = `98765${String(i).padStart(5, '0')}`;
      console.log(`📱 Assigning placeholder phone number ${placeholderPhone} to ${userDoc.staffId}`);
      userDoc.phoneNumber = placeholderPhone;
      updated = true;
    }

    // 3. Remove legacy isSuperAdmin field
    if ((userDoc as any).isSuperAdmin !== undefined) {
      userDoc.set('isSuperAdmin', undefined);
      updated = true;
    }

    if (updated) {
      await userDoc.save();
      updatedCount++;
    }
  }

  console.log(`✅ Migration complete. Updated ${updatedCount} users.`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
