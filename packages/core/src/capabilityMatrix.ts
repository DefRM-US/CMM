import { getDatabase } from './database';

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
}

export interface StoredRequirementRow {
  id: string;
  text: string;
  level: number;
  position: number;
}

type ProjectRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
};

type RequirementRowRecord = {
  id: string;
  text: string;
  level: number;
  position: number;
};

type SqlResultSet = {
  rows: {
    length: number;
    item: (index: number) => unknown;
  };
};

const mapRows = <T>(result: SqlResultSet): T[] => {
  const rows: T[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    rows.push(result.rows.item(i) as T);
  }
  return rows;
};

const mapProjectRow = (row: ProjectRow): ProjectRecord => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastOpenedAt: row.last_opened_at,
});

const generateProjectId = (): string =>
  `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const SAMPLE_PROJECT_PREFIX = 'Sample - ';

type SampleSeedSize = 'compact' | 'medium' | 'large';

type SampleRequirement = {
  text: string;
  level: number;
};

type SampleProject = {
  name: string;
  updatedAt: Date;
  requirements: SampleRequirement[];
};

const formatSqliteTimestampUTC = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

let requirementSeed = 0;
const generateRequirementId = (): string => {
  requirementSeed += 1;
  return `req-${Date.now().toString(36)}-${requirementSeed.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
};

const cloneRequirements = (requirements: SampleRequirement[]): SampleRequirement[] =>
  requirements.map((req) => ({ ...req }));

const buildSampleProjects = (now: Date, size: SampleSeedSize): SampleProject[] => {
  const baseRequirements: SampleRequirement[] = [
    { text: 'Project overview', level: 0 },
    { text: 'Target users', level: 1 },
    { text: 'Success metrics', level: 1 },
    { text: 'Core workflows', level: 0 },
    { text: 'Onboarding', level: 1 },
    { text: 'Account verification', level: 2 },
    { text: 'Reporting', level: 1 },
    { text: 'Risks & constraints', level: 0 },
  ];

  const justNow = new Date(now);
  const minutesAgo = new Date(now);
  minutesAgo.setMinutes(minutesAgo.getMinutes() - 15);
  const hoursAgo = new Date(now);
  hoursAgo.setHours(hoursAgo.getHours() - 3);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const earlierThisMonth = new Date(now);
  if (earlierThisMonth.getDate() >= 8) {
    earlierThisMonth.setDate(earlierThisMonth.getDate() - 7);
  } else {
    earlierThisMonth.setDate(1);
  }

  const lastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    10,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );

  const olderDate = new Date(now);
  olderDate.setDate(olderDate.getDate() - 90);

  const baseProjects: SampleProject[] = [
    {
      name: `${SAMPLE_PROJECT_PREFIX}Just now`,
      updatedAt: justNow,
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}15 minutes ago`,
      updatedAt: minutesAgo,
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}3 hours ago`,
      updatedAt: hoursAgo,
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}Yesterday`,
      updatedAt: yesterday,
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}Earlier this month`,
      updatedAt: earlierThisMonth,
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}Last month`,
      updatedAt: lastMonth,
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}May 10`,
      updatedAt: olderDate,
      requirements: cloneRequirements(baseRequirements),
    },
  ];

  if (size === 'compact') {
    return baseProjects;
  }

  const targetCount = size === 'medium' ? 12 : 20;
  const projects = [...baseProjects];
  for (let i = projects.length; i < targetCount; i += 1) {
    const offsetHours = (i - baseProjects.length + 1) * 6;
    const updatedAt = new Date(now);
    updatedAt.setHours(updatedAt.getHours() - offsetHours);
    projects.push({
      name: `${SAMPLE_PROJECT_PREFIX}Extra ${i - baseProjects.length + 1}`,
      updatedAt,
      requirements: cloneRequirements(baseRequirements),
    });
  }

  return projects;
};

export const listProjects = (): Promise<ProjectRecord[]> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction((txn) => {
      txn.executeSql(
        `SELECT id, name, created_at, updated_at, last_opened_at
           FROM projects
           ORDER BY updated_at DESC, created_at DESC`,
        [],
        (_tx, result) => {
          const rows = mapRows<ProjectRow>(result as SqlResultSet);
          resolve(rows.map(mapProjectRow));
        },
      );
    }, reject);
  });

export const createProject = (name: string): Promise<ProjectRecord> =>
  new Promise((resolve, reject) => {
    const trimmed = name.trim();
    if (!trimmed) {
      reject(new Error('Project name is required.'));
      return;
    }

    const db = getDatabase();
    const projectId = generateProjectId();
    let created: ProjectRecord | null = null;

    db.transaction(
      (txn) => {
        txn.executeSql(
          `INSERT INTO projects (id, name, created_at, updated_at, last_opened_at)
           VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [projectId, trimmed],
        );
        txn.executeSql(
          `SELECT id, name, created_at, updated_at, last_opened_at
           FROM projects
           WHERE id = ?`,
          [projectId],
          (_tx, result) => {
            const row = mapRows<ProjectRow>(result as SqlResultSet)[0];
            if (row) {
              created = mapProjectRow(row);
            }
          },
        );
      },
      reject,
      () => {
        if (created) {
          resolve(created);
        } else {
          reject(new Error('Failed to create project.'));
        }
      },
    );
  });

export const seedSampleProjects = async (size: SampleSeedSize = 'compact'): Promise<number> => {
  const existing = await listProjects();
  if (existing.some((project) => project.name.startsWith(SAMPLE_PROJECT_PREFIX))) {
    return 0;
  }

  const now = new Date();
  const samples = buildSampleProjects(now, size);
  const db = getDatabase();

  await new Promise<void>((resolve, reject) => {
    db.transaction(
      (txn) => {
        samples.forEach((sample) => {
          const projectId = generateProjectId();
          const timestamp = formatSqliteTimestampUTC(sample.updatedAt);
          txn.executeSql(
            `INSERT INTO projects (id, name, created_at, updated_at, last_opened_at)
             VALUES (?, ?, ?, ?, ?)`,
            [projectId, sample.name, timestamp, timestamp, timestamp],
          );
          sample.requirements.forEach((requirement, index) => {
            const requirementId = generateRequirementId();
            txn.executeSql(
              `INSERT INTO requirements (id, project_id, text, level, position, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                requirementId,
                projectId,
                requirement.text,
                requirement.level,
                index,
                timestamp,
                timestamp,
              ],
            );
          });
        });
      },
      reject,
      resolve,
    );
  });

  return samples.length;
};

export const touchProject = (projectId: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (txn) => {
        txn.executeSql(
          `UPDATE projects
           SET last_opened_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [projectId],
        );
      },
      reject,
      resolve,
    );
  });

export const loadProjectRequirements = (projectId: string): Promise<StoredRequirementRow[]> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction((txn) => {
      txn.executeSql(
        `SELECT id, text, level, position
           FROM requirements
           WHERE project_id = ?
           ORDER BY position ASC`,
        [projectId],
        (_tx, result) => {
          const rows = mapRows<RequirementRowRecord>(result as SqlResultSet);
          resolve(
            rows.map((row) => ({
              id: row.id,
              text: row.text,
              level: row.level,
              position: row.position,
            })),
          );
        },
      );
    }, reject);
  });

export const saveProjectRequirements = (
  projectId: string,
  rows: StoredRequirementRow[],
): Promise<void> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (txn) => {
        txn.executeSql(`DELETE FROM requirements WHERE project_id = ?`, [projectId]);
        rows.forEach((row, index) => {
          txn.executeSql(
            `INSERT INTO requirements (id, project_id, text, level, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [row.id, projectId, row.text, row.level, row.position ?? index],
          );
        });
        txn.executeSql(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
          projectId,
        ]);
      },
      reject,
      resolve,
    );
  });
