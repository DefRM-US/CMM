import type {
  OpportunityRepository,
  SaveActiveMemberResponseRepositoryInput,
} from '@cmm/application';
import type {
  BaseCapabilityMatrix,
  MemberResponse,
  MemberResponseRow,
  Opportunity,
  OpportunityId,
  Requirement,
} from '@cmm/domain';
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
  {
    id: 3,
    name: '0003_create_member_responses',
    sql: `
      CREATE TABLE member_responses (
        id TEXT PRIMARY KEY,
        opportunity_id TEXT NOT NULL
          REFERENCES opportunities(id) ON DELETE CASCADE,
        member_name TEXT NOT NULL,
        normalized_member_name TEXT NOT NULL,
        source_filename TEXT,
        workbook_title TEXT,
        imported_at TEXT NOT NULL,
        archived_at TEXT,
        evaluation_state TEXT
          CHECK (
            evaluation_state IS NULL
            OR evaluation_state IN ('candidate', 'selected', 'hidden')
          )
      );

      CREATE UNIQUE INDEX member_responses_active_member_name_idx
        ON member_responses (opportunity_id, normalized_member_name)
        WHERE archived_at IS NULL;

      CREATE INDEX member_responses_opportunity_active_order_idx
        ON member_responses (opportunity_id, archived_at, imported_at);

      CREATE TABLE member_response_rows (
        id TEXT PRIMARY KEY,
        member_response_id TEXT NOT NULL
          REFERENCES member_responses(id) ON DELETE CASCADE,
        requirement_id TEXT NOT NULL,
        requirement_number TEXT NOT NULL,
        requirement_text TEXT NOT NULL,
        capability_score INTEGER
          CHECK (capability_score IS NULL OR capability_score IN (0, 1, 2, 3)),
        past_performance_reference TEXT NOT NULL,
        response_comment TEXT NOT NULL,
        position INTEGER NOT NULL CHECK (position >= 0),
        UNIQUE (member_response_id, position)
      );

      CREATE INDEX member_response_rows_response_order_idx
        ON member_response_rows (member_response_id, position);
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

type MemberResponseRecordRow = {
  id: string;
  opportunity_id: string;
  member_name: string;
  source_filename: string | null;
  workbook_title: string | null;
  imported_at: string;
  archived_at: string | null;
  evaluation_state: 'candidate' | 'selected' | 'hidden' | null;
};

type MemberResponseRowRecord = {
  id: string;
  member_response_id: string;
  requirement_id: string;
  requirement_number: string;
  requirement_text: string;
  capability_score: 0 | 1 | 2 | 3 | null;
  past_performance_reference: string;
  response_comment: string;
  position: number;
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

const toMemberResponse = (row: MemberResponseRecordRow): MemberResponse => ({
  id: row.id,
  opportunityId: row.opportunity_id,
  memberName: row.member_name,
  sourceFilename: row.source_filename,
  workbookTitle: row.workbook_title,
  importedAt: row.imported_at,
  archivedAt: row.archived_at,
  evaluationState: row.evaluation_state,
});

const toMemberResponseRow = (row: MemberResponseRowRecord): MemberResponseRow => ({
  id: row.id,
  memberResponseId: row.member_response_id,
  requirementId: row.requirement_id,
  requirementNumber: row.requirement_number,
  requirementText: row.requirement_text,
  capabilityScore: row.capability_score,
  pastPerformanceReference: row.past_performance_reference,
  responseComment: row.response_comment,
  position: row.position,
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

  const listActiveMemberResponses = database.prepare(`
    SELECT
      id,
      opportunity_id,
      member_name,
      source_filename,
      workbook_title,
      imported_at,
      archived_at,
      evaluation_state
    FROM member_responses
    WHERE opportunity_id = ? AND archived_at IS NULL
    ORDER BY imported_at DESC, id ASC
  `);

  const listMemberResponseRows = database.prepare(`
    SELECT
      id,
      member_response_id,
      requirement_id,
      requirement_number,
      requirement_text,
      capability_score,
      past_performance_reference,
      response_comment,
      position
    FROM member_response_rows
    WHERE member_response_id = ?
    ORDER BY position ASC
  `);

  const findMemberResponseById = database.prepare(`
    SELECT
      id,
      opportunity_id,
      member_name,
      source_filename,
      workbook_title,
      imported_at,
      archived_at,
      evaluation_state
    FROM member_responses
    WHERE id = ?
  `);

  const archiveActiveMemberResponses = database.prepare(`
    UPDATE member_responses
    SET archived_at = ?, evaluation_state = NULL
    WHERE opportunity_id = ? AND normalized_member_name = ? AND archived_at IS NULL
  `);

  const insertMemberResponse = database.prepare(`
    INSERT INTO member_responses (
      id,
      opportunity_id,
      member_name,
      normalized_member_name,
      source_filename,
      workbook_title,
      imported_at,
      archived_at,
      evaluation_state
    ) VALUES (
      @id,
      @opportunityId,
      @memberName,
      @normalizedMemberName,
      @sourceFilename,
      @workbookTitle,
      @importedAt,
      @archivedAt,
      @evaluationState
    )
  `);

  const insertMemberResponseRow = database.prepare(`
    INSERT INTO member_response_rows (
      id,
      member_response_id,
      requirement_id,
      requirement_number,
      requirement_text,
      capability_score,
      past_performance_reference,
      response_comment,
      position
    ) VALUES (
      @id,
      @memberResponseId,
      @requirementId,
      @requirementNumber,
      @requirementText,
      @capabilityScore,
      @pastPerformanceReference,
      @responseComment,
      @position
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

  const saveActiveMemberResponse = database.transaction(
    (input: SaveActiveMemberResponseRepositoryInput) => {
      archiveActiveMemberResponses.run(
        input.archivedAt,
        input.memberResponse.opportunityId,
        input.normalizedMemberName,
      );
      insertMemberResponse.run({
        ...input.memberResponse,
        normalizedMemberName: input.normalizedMemberName,
      });
      for (const row of input.rows) {
        insertMemberResponseRow.run(row);
      }

      const row = findMemberResponseById.get(input.memberResponse.id);
      if (!row) {
        throw new Error('Member Response not found after save.');
      }
      return toMemberResponse(row as MemberResponseRecordRow);
    },
  );

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

    async listActiveMemberResponses(opportunityId) {
      return listActiveMemberResponses
        .all(opportunityId)
        .map((row) => toMemberResponse(row as MemberResponseRecordRow));
    },

    async loadMemberResponseRows(memberResponseId) {
      return listMemberResponseRows
        .all(memberResponseId)
        .map((row) => toMemberResponseRow(row as MemberResponseRowRecord));
    },

    async saveActiveMemberResponse(input) {
      return saveActiveMemberResponse(input);
    },
  };
};
