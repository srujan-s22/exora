import mongoose from 'mongoose';
import { User } from '../src/lib/db/models/user.model';
import { Exhibition } from '../src/lib/db/models/exhibition.model';
import { Ticket } from '../src/lib/db/models/ticket.model';
import { TicketScan } from '../src/lib/db/models/ticket-scan.model';
import { Sale } from '../src/lib/db/models/sale.model';
import { AuditLog } from '../src/lib/db/models/audit-log.model';
import { connectToDatabase } from '../src/lib/db/connection';
import { hashPassword, sha256 } from '../src/lib/utils/crypto';
import { loadEnvConfig } from '@next/env';

// Load env variables
loadEnvConfig(process.cwd());

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to run seed script in production environment to prevent data loss!');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined in .env.local');
  }

  console.log('🌱 Starting database seed...');
  await connectToDatabase();

  // 1. Clear existing data (dangerous in production, but safe in dev)
  console.log('🧹 Clearing existing collections...');
  await User.deleteMany({});
  await Exhibition.deleteMany({});
  await Ticket.deleteMany({});
  await TicketScan.deleteMany({});
  await Sale.deleteMany({});
  await AuditLog.deleteMany({});

  // 2. Hash passwords
  console.log('🔐 Hashing default staff credentials...');
  const adminHash = await hashPassword('admin123');
  const counterHash = await hashPassword('counter123');
  const gateHash = await hashPassword('gate123');

  // 3. Create Exhibitions first to link them to staff scope
  console.log('🎨 Seeding mock exhibitions...');
  const adminObjectId = new mongoose.Types.ObjectId();

  const exh1 = await Exhibition.create({
    name: 'National Art & Sculpture Biennale 2026',
    slug: 'art-sculpture-biennale-2026',
    description: 'National and international collections of modern sculpture art pieces.',
    venue: 'Hall A, Pragati Maidan, New Delhi',
    address: 'Pragati Maidan, New Delhi, Delhi 110001',
    startDate: new Date('2026-05-01'),
    endDate: new Date('2026-06-15'),
    ticketTypes: [
      { name: 'adult', price: 25000, maxQuantity: 5000 },
      { name: 'child', price: 10000, maxQuantity: 2000 },
    ],
    status: 'active',
    settings: { allowMultiEntry: false, maxScansPerTicket: 1 },
    createdBy: adminObjectId,
  });

  const exh2 = await Exhibition.create({
    name: 'India Tech & AI Expo (ITAE)',
    slug: 'india-tech-ai-expo-2026',
    description: 'Future technologies expo, showcasing artificial intelligence research and hardware.',
    venue: 'Convention Centre, HITEC City, Hyderabad',
    address: 'HITEC City, Madhapur, Hyderabad, Telangana 500081',
    startDate: new Date('2026-05-25'),
    endDate: new Date('2026-05-30'),
    ticketTypes: [
      { name: 'general', price: 50000, maxQuantity: 8000 },
      { name: 'VIP', price: 150000, maxQuantity: 500 },
    ],
    status: 'active',
    settings: { allowMultiEntry: false, maxScansPerTicket: 1 },
    createdBy: adminObjectId,
  });

  const exh3 = await Exhibition.create({
    name: 'International Book Fair & Literary Fest',
    slug: 'intl-book-fair-lit-fest',
    description: 'Annual international book fair featuring publishers and authors from across the globe.',
    venue: 'Palace Grounds, Bengaluru',
    address: 'Palace Grounds, Jayamahal, Bengaluru, Karnataka 560006',
    startDate: new Date('2026-06-10'),
    endDate: new Date('2026-06-20'),
    ticketTypes: [
      { name: 'standard', price: 5000 },
    ],
    status: 'draft',
    settings: { allowMultiEntry: false, maxScansPerTicket: 1 },
    createdBy: adminObjectId,
  });

  // 4. Create Staff Roster
  console.log('👤 Seeding default staff roster...');
  
  // Admin
  await User.create({
    _id: adminObjectId,
    staffId: 'ADM-001',
    name: 'Soham Admin',
    email: 'admin@exora.com',
    phoneNumber: '9876500000',
    passwordHash: adminHash,
    role: 'admin',
    assignedExhibitions: [],
    isActive: true,
    createdBy: adminObjectId,
  });

  // Counters
  const counter1 = await User.create({
    staffId: 'CTR-001',
    name: 'Soham Counter Staff 1',
    phoneNumber: '9876500001',
    passwordHash: counterHash,
    role: 'counter',
    assignedExhibitions: [exh1._id, exh2._id],
    isActive: true,
    createdBy: adminObjectId,
  });

  const counter2 = await User.create({
    staffId: 'CTR-002',
    name: 'Soham Counter Staff 2',
    phoneNumber: '9876500002',
    passwordHash: counterHash,
    role: 'counter',
    assignedExhibitions: [exh1._id],
    isActive: true,
    createdBy: adminObjectId,
  });

  // Gates
  const gate1 = await User.create({
    staffId: 'GTE-001',
    name: 'Soham Gate Staff 1',
    phoneNumber: '9876500003',
    passwordHash: gateHash,
    role: 'gate',
    assignedExhibitions: [exh1._id, exh2._id],
    isActive: true,
    createdBy: adminObjectId,
  });

  const gate2 = await User.create({
    staffId: 'GTE-002',
    name: 'Soham Gate Staff 2',
    phoneNumber: '9876500004',
    passwordHash: gateHash,
    role: 'gate',
    assignedExhibitions: [exh1._id],
    isActive: true,
    createdBy: adminObjectId,
  });

  // 5. Create some initial ticket and sales data to populate dashboard lists
  console.log('🎫 Seeding initial sales & ticket logs...');
  
  // Issue 2 tickets
  const qrPayload1 = 'EXH-20260529-00101:exh-1:1780000000000:mock-sig-1';
  const t1 = await Ticket.create({
    ticketNumber: 'EXH-20260529-00101',
    exhibitionId: exh1._id,
    ticketType: 'adult',
    price: 25000,
    qrPayload: qrPayload1,
    qrHash: sha256(qrPayload1),
    status: 'used',
    scanCount: 1,
    soldBy: counter1._id,
    soldAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    usedAt: new Date(Date.now() - 1000 * 60 * 15), // 15m ago
    usedBy: gate1._id,
    paymentMethod: 'cash',
  });

  const qrPayload2 = 'EXH-20260529-00102:exh-1:1780000000000:mock-sig-2';
  const t2 = await Ticket.create({
    ticketNumber: 'EXH-20260529-00102',
    exhibitionId: exh1._id,
    ticketType: 'child',
    price: 10000,
    qrPayload: qrPayload2,
    qrHash: sha256(qrPayload2),
    status: 'valid',
    scanCount: 0,
    soldBy: counter1._id,
    soldAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    paymentMethod: 'upi',
  });

  // Create sales record
  await Sale.create({
    transactionId: 'TXN-20260529-00001',
    exhibitionId: exh1._id,
    tickets: [t1._id, t2._id],
    ticketCount: 2,
    totalAmount: 35000,
    paymentMethod: 'cash',
    soldBy: counter1._id,
    soldAt: new Date(Date.now() - 1000 * 60 * 60),
  });

  // Create scan history
  await TicketScan.create({
    ticketId: t1._id,
    exhibitionId: exh1._id,
    scannedBy: gate1._id,
    scannedAt: new Date(Date.now() - 1000 * 60 * 15),
    result: 'admitted',
    qrPayloadRaw: qrPayload1,
  });

  // Seed initial audit log entries
  await AuditLog.create({
    action: 'exhibition.create',
    performedBy: adminObjectId,
    performedByRole: 'admin',
    targetType: 'exhibition',
    targetId: exh1._id,
    details: { name: exh1.name },
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
  });

  await AuditLog.create({
    action: 'user.create',
    performedBy: adminObjectId,
    performedByRole: 'admin',
    targetType: 'user',
    targetId: counter1._id,
    details: { staffId: counter1.staffId },
    timestamp: new Date(Date.now() - 1000 * 60 * 110),
  });

  console.log('✅ Seeding complete!');
  console.log('   Default Roster Accounts:');
  console.log('   👤 Admin   -> ADM-001 / admin123');
  console.log('   👤 Counter -> CTR-001 / counter123, CTR-002 / counter123');
  console.log('   👤 Gate    -> GTE-001 / gate123, GTE-002 / gate123');

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
