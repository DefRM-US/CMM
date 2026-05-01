import type { OpportunityRepository } from '@cmm/application';
import type { Opportunity, OpportunityId } from '@cmm/domain';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import Database from 'better-sqlite3';

export type CmmSqliteDatabase = SqliteDatabase;

type Migration = {
  id: number;
  name: string;
  sql: string;
};

const migrations: Migration[] = [
  {
    id: 1,
    name: '0001_create_opportunities',
    sql: `
      CREATE TABLE opportunities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        solicitation_number TEXT,
        issuing_agency TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_opened_at TEXT,
        archived_at TEXT
      );

      CREATE INDEX opportunities_active_order_idx
        ON opportunities (archived_at, last_opened_at, updated_at, created_at);
    `,
  },
];

type MigrationRow = {
  id: number;
};

type OpportunityRow = {
  id: string;
  name: string;
  solicitation_number: string | null;
  issuing_agency: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
  archived_at: string | null;
};

const toOpportunity = (row: OpportunityRow): Opportunity => ({
  id: row.id,
  name: row.name,
  solicitationNumber: row.solicitation_number,
  issuingAgency: row.issuing_agency,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastOpenedAt: row.last_opened_at,
  archivedAt: row.archived_at,
});

export const runSqliteMigrations = (database: SqliteDatabase): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied = new Set(
    database
      .prepare('SELECT id FROM schema_migrations')
      .all()
      .map((row) => (row as MigrationRow).id),
  );
  const insertMigration = database.prepare(
    'INSERT INTO schema_migrations (id, name) VALUES (@id, @name)',
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    const applyMigration = database.transaction(() => {
      database.exec(migration.sql);
      insertMigration.run({
        id: migration.id,
        name: migration.name,
      });
    });
    applyMigration();
  }
};

export const createCmmSqliteDatabase = (databasePath: string): SqliteDatabase => {
  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  runSqliteMigrations(database);
  return database;
};

export const createSqliteOpportunityRepository = (
  database: SqliteDatabase,
): OpportunityRepository => {
  const insertOpportunity = database.prepare(`
    INSERT INTO opportunities (
      id,
      name,
      solicitation_number,
      issuing_agency,
      description,
      created_at,
      updated_at,
      last_opened_at,
      archived_at
    ) VALUES (
      @id,
      @name,
      @solicitationNumber,
      @issuingAgency,
      @description,
      @createdAt,
      @updatedAt,
      @lastOpenedAt,
      @archivedAt
    )
  `);

  const listActive = database.prepare(`
    SELECT
      id,
      name,
      solicitation_number,
      issuing_agency,
      description,
      created_at,
      updated_at,
      last_opened_at,
      archived_at
    FROM opportunities
    WHERE archived_at IS NULL
    ORDER BY COALESCE(last_opened_at, updated_at, created_at) DESC, created_at DESC
  `);

  const findActiveById = database.prepare(`
    SELECT
      id,
      name,
      solicitation_number,
      issuing_agency,
      description,
      created_at,
      updated_at,
      last_opened_at,
      archived_at
    FROM opportunities
    WHERE id = ? AND archived_at IS NULL
  `);

  const markOpened = database.prepare(`
    UPDATE opportunities
    SET last_opened_at = ?
    WHERE id = ? AND archived_at IS NULL
  `);

  return {
    async saveOpportunity(opportunity) {
      insertOpportunity.run(opportunity);
    },

    async listActiveOpportunities() {
      return listActive.all().map((row) => toOpportunity(row as OpportunityRow));
    },

    async findActiveOpportunityById(opportunityId: OpportunityId) {
      const row = findActiveById.get(opportunityId);
      return row ? toOpportunity(row as OpportunityRow) : null;
    },

    async markOpportunityOpened(opportunityId, lastOpenedAt) {
      markOpened.run(lastOpenedAt, opportunityId);
      const row = findActiveById.get(opportunityId);
      if (!row) {
        throw new Error('Opportunity not found.');
      }
      return toOpportunity(row as OpportunityRow);
    },
  };
};
