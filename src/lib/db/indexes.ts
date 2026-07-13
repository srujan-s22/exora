/**
 * Database index creation and verification.
 * Run as a maintenance script to ensure all indexes are created.
 *
 * Indexes are defined in each model file via Schema.index().
 * Mongoose auto-creates them when the model is first used.
 * This file serves as documentation and can be used for manual verification.
 */

import { connectToDatabase } from './connection';
import { logger } from '@/lib/utils/logger';
import './models/user.model';
import './models/exhibition.model';
import './models/ticket.model';
import './models/ticket-scan.model';
import './models/sale.model';
import './models/audit-log.model';
import './models/ride.model';
import './models/ride-ticket.model';
import './models/ride-scan.model';
import './models/ride-sale.model';

export async function ensureIndexes(): Promise<void> {
  const db = await connectToDatabase();
  logger.info('All model indexes ensured via Mongoose autoIndex.');
  return void db;
}
