import type { OpportunityRepository } from '@cmm/application';
import type { BaseCapabilityMatrix, Opportunity, OpportunityId, Requirement } from '@cmm/domain';
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
  {
    id: 2,
    name: '0002_create_base_capability_matrices',
    sql: `
      CREATE TABLE base_capability_matrices (
        opportunity_id TEXT PRIMARY KEY
          REFERENCES opportunities(id) ON DELETE CASCADE,
        revision INTEGER NOT NULL DEFAULT 0
      );

      INSERT INTO base_capability_matrices (opportunity_id, revision)
      SELECT id, 0
      FROM opportunities
      WHERE id NOT IN (SELECT opportunity_id FROM base_capability_matrices);

      CREATE TABLE requirements (
        id TEXT PRIMARY KEY,
        opportunity_id TEXT NOT NULL
          REFERENCES base_capability_matrices(opportunity_id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        level INTEGER NOT NULL CHECK (level >= 1),
        position INTEGER NOT NULL CHECK (position >= 0),
        retired_at TEXT,
        UNIQUE (opportunity_id, position)
      );

      CREATE INDEX requirements_opportunity_order_idx
        ON requirements (opportunity_id, position);
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

type BaseCapabilityMatrixRow = {
  opportunity_id: string;
  revision: number;
};

type RequirementRow = {
  id: string;
  opportunity_id: string;
  text: string;
  level: number;
  position: number;
  retired_at: string | null;
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

const toRequirement = (row: RequirementRow): Requirement => ({
  id: row.id,
  text: row.text,
  level: row.level,
  position: row.position,
  retiredAt: row.retired_at,
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

  const listArchived = database.prepare(`
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
    WHERE archived_at IS NOT NULL
    ORDER BY archived_at DESC, updated_at DESC, created_at DESC
  `);

  const findArchivedById = database.prepare(`
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
    WHERE id = ? AND archived_at IS NOT NULL
  `);

  const markOpened = database.prepare(`
    UPDATE opportunities
    SET last_opened_at = ?
    WHERE id = ? AND archived_at IS NULL
  `);

  const archiveOpportunity = database.prepare(`
    UPDATE opportunities
    SET archived_at = ?, updated_at = ?
    WHERE id = ? AND archived_at IS NULL
  `);

  const restoreArchivedOpportunity = database.prepare(`
    UPDATE opportunities
    SET archived_at = NULL, updated_at = ?
    WHERE id = ? AND archived_at IS NOT NULL
  `);

  const hardDeleteArchivedOpportunity = database.prepare(`
    DELETE FROM opportunities
    WHERE id = ? AND archived_at IS NOT NULL
  `);

  const insertBaseCapabilityMatrix = database.prepare(`
    INSERT INTO base_capability_matrices (opportunity_id, revision)
    VALUES (?, 0)
  `);

  const findBaseCapabilityMatrix = database.prepare(`
    SELECT opportunity_id, revision
    FROM base_capability_matrices
    WHERE opportunity_id = ?
  `);

  const listRequirements = database.prepare(`
    SELECT
      id,
      opportunity_id,
      text,
      level,
      position,
      retired_at
    FROM requirements
    WHERE opportunity_id = ?
    ORDER BY position ASC
  `);

  const updateBaseCapabilityMatrixRevision = database.prepare(`
    UPDATE base_capability_matrices
    SET revision = ?
    WHERE opportunity_id = ? AND revision = ?
  `);

  const deleteRequirementsForOpportunity = database.prepare(`
    DELETE FROM requirements
    WHERE opportunity_id = ?
  `);

  const insertRequirement = database.prepare(`
    INSERT INTO requirements (
      id,
      opportunity_id,
      text,
      level,
      position,
      retired_at
    ) VALUES (
      @id,
      @opportunityId,
      @text,
      @level,
      @position,
      @retiredAt
    )
  `);

  const loadMatrix = (opportunityId: OpportunityId): BaseCapabilityMatrix => {
    const matrixRow = findBaseCapabilityMatrix.get(opportunityId) as
      | BaseCapabilityMatrixRow
      | undefined;
    if (!matrixRow) {
      throw new Error('Base Capability Matrix not found.');
    }

    return {
      opportunityId: matrixRow.opportunity_id,
      revision: matrixRow.revision,
      requirements: listRequirements
        .all(opportunityId)
        .map((row) => toRequirement(row as RequirementRow)),
    };
  };

  const saveOpportunityWithMatrix = database.transaction((opportunity: Opportunity) => {
    insertOpportunity.run(opportunity);
    insertBaseCapabilityMatrix.run(opportunity.id);
  });

  const saveMatrix = database.transaction((matrix: BaseCapabilityMatrix) => {
    const current = loadMatrix(matrix.opportunityId);
    const nextRevision = matrix.revision + 1;
    const updateResult = updateBaseCapabilityMatrixRevision.run(
      nextRevision,
      matrix.opportunityId,
      matrix.revision,
    );
    if (current.revision !== matrix.revision || updateResult.changes === 0) {
      throw new Error('Base Capability Matrix revision conflict.');
    }

    deleteRequirementsForOpportunity.run(matrix.opportunityId);
    for (const requirement of matrix.requirements) {
      insertRequirement.run({
        id: requirement.id,
        opportunityId: matrix.opportunityId,
        text: requirement.text,
        level: requirement.level,
        position: requirement.position,
        retiredAt: requirement.retiredAt,
      });
    }

    return loadMatrix(matrix.opportunityId);
  });

  return {
    async saveOpportunity(opportunity) {
      saveOpportunityWithMatrix(opportunity);
    },

    async listActiveOpportunities() {
      return listActive.all().map((row) => toOpportunity(row as OpportunityRow));
    },

    async listArchivedOpportunities() {
      return listArchived.all().map((row) => toOpportunity(row as OpportunityRow));
    },

    async findActiveOpportunityById(opportunityId: OpportunityId) {
      const row = findActiveById.get(opportunityId);
      return row ? toOpportunity(row as OpportunityRow) : null;
    },

    async findArchivedOpportunityById(opportunityId: OpportunityId) {
      const row = findArchivedById.get(opportunityId);
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

    async archiveOpportunity(opportunityId, archivedAt) {
      archiveOpportunity.run(archivedAt, archivedAt, opportunityId);
      const row = findArchivedById.get(opportunityId);
      if (!row) {
        throw new Error('Opportunity not found.');
      }
      return toOpportunity(row as OpportunityRow);
    },

    async restoreArchivedOpportunity(opportunityId, restoredAt) {
      restoreArchivedOpportunity.run(restoredAt, opportunityId);
      const row = findActiveById.get(opportunityId);
      if (!row) {
        throw new Error('Opportunity not found.');
      }
      return toOpportunity(row as OpportunityRow);
    },

    async hardDeleteArchivedOpportunity(opportunityId) {
      const result = hardDeleteArchivedOpportunity.run(opportunityId);
      if (result.changes === 0) {
        throw new Error('Opportunity not found.');
      }
    },

    async loadBaseCapabilityMatrix(opportunityId) {
      return loadMatrix(opportunityId);
    },

    async saveBaseCapabilityMatrix(matrix) {
      return saveMatrix(matrix);
    },
  };
};
