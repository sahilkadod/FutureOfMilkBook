import type {Collection, Db, Document} from 'mongodb';
import clientPromise from './mongodb';

export interface CustomerDocument extends Document {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  version: number;
  archivedAt?: Date | null;
}

export interface MilkEntryDocument extends Document {
  id: string;
  userId: string;
  customerId: string;
  date: string;
  morningLitres: number;
  morningFat: number;
  eveningLitres: number;
  eveningFat: number;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deviceId?: string;
}

export interface MonthlyRateDocument extends Document {
  id: string;
  userId: string;
  month: number;
  year: number;
  rate: number;
  effectiveFrom: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface BillingAdjustmentDocument extends Document {
  id: string;
  userId: string;
  customerId: string;
  period: string;
  amount: number;
  reason: string;
  createdAt: Date;
  createdBy: string;
}

export interface AuditEventDocument extends Document {
  id: string;
  userId: string;
  entityType: 'customer' | 'milkEntry' | 'monthlyRate' | 'billingAdjustment';
  entityId: string;
  action: 'created' | 'updated' | 'archived' | 'restored';
  occurredAt: Date;
  actorId: string;
  metadata?: Record<string, unknown>;
}

export interface MilkBookCollections {
  customers: Collection<CustomerDocument>;
  milkEntries: Collection<MilkEntryDocument>;
  monthlyRates: Collection<MonthlyRateDocument>;
  billingAdjustments: Collection<BillingAdjustmentDocument>;
  auditEvents: Collection<AuditEventDocument>;
}

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  const databaseName = process.env.MONGODB_DB_NAME;

  if (!databaseName) {
    throw new Error('Missing MONGODB_DB_NAME environment variable.');
  }

  return client.db(databaseName);
}

/**
 * Run once during deployment setup or a controlled migration.
 * Indexes enforce per-owner identifiers and support common dairy queries.
 */
export async function ensureDatabaseIndexes(db?: Db): Promise<void> {
  const database = db ?? (await getDatabase());

  await Promise.all([
    database.collection<CustomerDocument>('customers').createIndex(
      {userId: 1, id: 1},
      {unique: true, name: 'customer_owner_id_unique'},
    ),
    database.collection<CustomerDocument>('customers').createIndex(
      {userId: 1, status: 1, name: 1},
      {name: 'customer_owner_status_name'},
    ),
    database.collection<CustomerDocument>('customers').createIndex(
      {userId: 1, phone: 1},
      {name: 'customer_owner_phone'},
    ),
    database.collection<MilkEntryDocument>('milkEntries').createIndex(
      {userId: 1, id: 1},
      {unique: true, name: 'milk_entry_owner_id_unique'},
    ),
    database.collection<MilkEntryDocument>('milkEntries').createIndex(
      {userId: 1, customerId: 1, date: 1},
      {name: 'milk_entry_customer_date'},
    ),
    database.collection<MonthlyRateDocument>('monthlyRates').createIndex(
      {userId: 1, year: 1, month: 1},
      {unique: true, name: 'monthly_rate_owner_period_unique'},
    ),
    database.collection<BillingAdjustmentDocument>(
      'billingAdjustments',
    ).createIndex(
      {userId: 1, customerId: 1, period: 1},
      {name: 'billing_adjustment_customer_period'},
    ),
    database.collection<AuditEventDocument>('auditEvents').createIndex(
      {userId: 1, entityType: 1, entityId: 1, occurredAt: -1},
      {name: 'audit_entity_timeline'},
    ),
  ]);
}

export async function getMilkBookCollections(): Promise<MilkBookCollections> {
  const db = await getDatabase();

  return {
    customers: db.collection<CustomerDocument>('customers'),
    milkEntries: db.collection<MilkEntryDocument>('milkEntries'),
    monthlyRates: db.collection<MonthlyRateDocument>('monthlyRates'),
    billingAdjustments: db.collection<BillingAdjustmentDocument>(
      'billingAdjustments',
    ),
    auditEvents: db.collection<AuditEventDocument>('auditEvents'),
  };
}
