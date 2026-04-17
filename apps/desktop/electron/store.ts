import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildCapabilityMatrixXlsxBuffer,
  type CapabilityMatrixExportOptions,
  type ParsedCapabilityMatrixSheet,
  parseCapabilityMatrixXlsxBuffer,
} from '../../../packages/core/src/excel-buffer';

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

export interface CapabilityImportRecord {
  id: string;
  projectId: string;
  companyName: string;
  sourceFilename: string | null;
  importedAt: string;
  archivedAt: string | null;
}

export interface CapabilityImportRowRecord {
  id: string;
  importId: string;
  requirementId: string | null;
  requirementNumber: string;
  requirementText: string;
  score: number | null;
  pastPerformance: string | null;
  comments: string | null;
}

export interface CapabilityImportRowInput {
  requirementId: string | null;
  requirementNumber: string;
  requirementText: string;
  score: number | null;
  pastPerformance?: string | null;
  comments?: string | null;
}

type SampleSeedSize = 'compact' | 'medium' | 'large';

type DatabaseState = {
  projects: ProjectRecord[];
  requirementsByProject: Record<string, StoredRequirementRow[]>;
  capabilityImports: CapabilityImportRecord[];
  capabilityImportRowsByImport: Record<string, CapabilityImportRowRecord[]>;
};

const DB_FILENAME = 'capability-matrix-manager.json';
const EMPTY_STATE: DatabaseState = {
  projects: [],
  requirementsByProject: {},
  capabilityImports: [],
  capabilityImportRowsByImport: {},
};

const SAMPLE_PROJECT_PREFIX = 'Sample - ';

const cloneState = (state: DatabaseState): DatabaseState => ({
  projects: state.projects.map((project) => ({ ...project })),
  requirementsByProject: Object.fromEntries(
    Object.entries(state.requirementsByProject).map(([projectId, rows]) => [
      projectId,
      rows.map((row) => ({ ...row })),
    ]),
  ),
  capabilityImports: state.capabilityImports.map((entry) => ({ ...entry })),
  capabilityImportRowsByImport: Object.fromEntries(
    Object.entries(state.capabilityImportRowsByImport).map(([importId, rows]) => [
      importId,
      rows.map((row) => ({ ...row })),
    ]),
  ),
});

const nowIso = () => new Date().toISOString();

const sortProjects = (projects: ProjectRecord[]) =>
  [...projects].sort((left, right) => {
    const updatedDiff = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (updatedDiff !== 0) return updatedDiff;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

type SampleRequirement = {
  text: string;
  level: number;
};

type SampleProject = {
  name: string;
  updatedAt: string;
  requirements: SampleRequirement[];
};

const cloneRequirements = (requirements: SampleRequirement[]): SampleRequirement[] =>
  requirements.map((requirement) => ({ ...requirement }));

const buildSampleProjects = (size: SampleSeedSize): SampleProject[] => {
  const now = new Date();
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

  const baseProjects: SampleProject[] = [
    {
      name: `${SAMPLE_PROJECT_PREFIX}Just now`,
      updatedAt: new Date(now).toISOString(),
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}15 minutes ago`,
      updatedAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}3 hours ago`,
      updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}Yesterday`,
      updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}Earlier this month`,
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}Last month`,
      updatedAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      requirements: cloneRequirements(baseRequirements),
    },
    {
      name: `${SAMPLE_PROJECT_PREFIX}May 10`,
      updatedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      requirements: cloneRequirements(baseRequirements),
    },
  ];

  if (size === 'compact') return baseProjects;

  const targetCount = size === 'medium' ? 12 : 20;
  const projects = [...baseProjects];
  for (let index = projects.length; index < targetCount; index += 1) {
    projects.push({
      name: `${SAMPLE_PROJECT_PREFIX}Extra ${index - baseProjects.length + 1}`,
      updatedAt: new Date(now.getTime() - (index + 1) * 6 * 60 * 60 * 1000).toISOString(),
      requirements: cloneRequirements(baseRequirements),
    });
  }
  return projects;
};

export function createDesktopStore(dataDir: string) {
  const dataFile = path.join(dataDir, DB_FILENAME);
  let queue = Promise.resolve<unknown>(undefined);

  const ensureFile = async () => {
    await mkdir(dataDir, { recursive: true });
    try {
      await readFile(dataFile, 'utf8');
    } catch {
      await writeFile(dataFile, JSON.stringify(EMPTY_STATE, null, 2), 'utf8');
    }
  };

  const readState = async (): Promise<DatabaseState> => {
    await ensureFile();
    const content = await readFile(dataFile, 'utf8');
    const parsed = JSON.parse(content) as Partial<DatabaseState>;
    return {
      projects: parsed.projects ?? [],
      requirementsByProject: parsed.requirementsByProject ?? {},
      capabilityImports: parsed.capabilityImports ?? [],
      capabilityImportRowsByImport: parsed.capabilityImportRowsByImport ?? {},
    };
  };

  const writeState = async (state: DatabaseState) => {
    await ensureFile();
    await writeFile(dataFile, JSON.stringify(state, null, 2), 'utf8');
  };

  const enqueue = async <T>(task: (state: DatabaseState) => Promise<T> | T): Promise<T> => {
    const next = queue.then(async () => {
      const state = await readState();
      const mutable = cloneState(state);
      const result = await task(mutable);
      await writeState(mutable);
      return result;
    });
    queue = next.catch(() => undefined);
    return next;
  };

  return {
    async initDatabase() {
      await ensureFile();
    },
    async listProjects() {
      const state = await readState();
      return sortProjects(state.projects);
    },
    async createProject(name: string) {
      return enqueue((state) => {
        const trimmed = name.trim();
        if (!trimmed) {
          throw new Error('Project name is required.');
        }
        const timestamp = nowIso();
        const project: ProjectRecord = {
          id: randomUUID(),
          name: trimmed,
          createdAt: timestamp,
          updatedAt: timestamp,
          lastOpenedAt: timestamp,
        };
        state.projects.push(project);
        state.requirementsByProject[project.id] = [];
        return project;
      });
    },
    async deleteProjects(projectIds: string[]) {
      await enqueue((state) => {
        const ids = new Set(projectIds.filter(Boolean));
        state.projects = state.projects.filter((project) => !ids.has(project.id));
        Object.keys(state.requirementsByProject).forEach((projectId) => {
          if (ids.has(projectId)) {
            delete state.requirementsByProject[projectId];
          }
        });
        const archivedImportIds = new Set<string>();
        state.capabilityImports = state.capabilityImports.filter((entry) => {
          const keep = !ids.has(entry.projectId);
          if (!keep) archivedImportIds.add(entry.id);
          return keep;
        });
        Object.keys(state.capabilityImportRowsByImport).forEach((importId) => {
          if (archivedImportIds.has(importId)) {
            delete state.capabilityImportRowsByImport[importId];
          }
        });
      });
    },
    async seedSampleProjects(size: SampleSeedSize = 'compact') {
      return enqueue((state) => {
        if (state.projects.some((project) => project.name.startsWith(SAMPLE_PROJECT_PREFIX))) {
          return 0;
        }
        const samples = buildSampleProjects(size);
        samples.forEach((sample) => {
          const projectId = randomUUID();
          const project: ProjectRecord = {
            id: projectId,
            name: sample.name,
            createdAt: sample.updatedAt,
            updatedAt: sample.updatedAt,
            lastOpenedAt: sample.updatedAt,
          };
          state.projects.push(project);
          state.requirementsByProject[projectId] = sample.requirements.map(
            (requirement, index) => ({
              id: randomUUID(),
              text: requirement.text,
              level: requirement.level,
              position: index,
            }),
          );
        });
        return samples.length;
      });
    },
    async touchProject(projectId: string) {
      await enqueue((state) => {
        const project = state.projects.find((entry) => entry.id === projectId);
        if (project) {
          project.lastOpenedAt = nowIso();
        }
      });
    },
    async loadProjectRequirements(projectId: string) {
      const state = await readState();
      return [...(state.requirementsByProject[projectId] ?? [])].sort(
        (left, right) => left.position - right.position,
      );
    },
    async saveProjectRequirements(projectId: string, rows: StoredRequirementRow[]) {
      await enqueue((state) => {
        state.requirementsByProject[projectId] = rows.map((row, index) => ({
          ...row,
          position: row.position ?? index,
        }));
        const project = state.projects.find((entry) => entry.id === projectId);
        if (project) {
          project.updatedAt = nowIso();
        }
      });
    },
    async listCapabilityImports(projectId: string, includeArchived = false) {
      const state = await readState();
      return state.capabilityImports
        .filter(
          (entry) =>
            entry.projectId === projectId && (includeArchived ? true : entry.archivedAt === null),
        )
        .sort(
          (left, right) =>
            new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime(),
        );
    },
    async listCapabilityImportRows(importId: string) {
      const state = await readState();
      return [...(state.capabilityImportRowsByImport[importId] ?? [])].sort((left, right) =>
        left.requirementNumber.localeCompare(right.requirementNumber, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );
    },
    async saveCapabilityImportWithRows(input: {
      projectId: string;
      companyName: string;
      sourceFilename?: string | null;
      rows: CapabilityImportRowInput[];
    }) {
      return enqueue((state) => {
        const trimmedCompany = input.companyName.trim();
        if (!trimmedCompany) {
          throw new Error('Company name is required.');
        }
        const importedAt = nowIso();
        state.capabilityImports.forEach((entry) => {
          if (
            entry.projectId === input.projectId &&
            entry.companyName === trimmedCompany &&
            entry.archivedAt === null
          ) {
            entry.archivedAt = importedAt;
          }
        });
        const importId = randomUUID();
        const record: CapabilityImportRecord = {
          id: importId,
          projectId: input.projectId,
          companyName: trimmedCompany,
          sourceFilename: input.sourceFilename ?? null,
          importedAt,
          archivedAt: null,
        };
        state.capabilityImports.push(record);
        state.capabilityImportRowsByImport[importId] = input.rows.map((row) => ({
          id: randomUUID(),
          importId,
          requirementId: row.requirementId,
          requirementNumber: row.requirementNumber,
          requirementText: row.requirementText,
          score: row.score,
          pastPerformance: row.pastPerformance ?? null,
          comments: row.comments ?? null,
        }));
        return record;
      });
    },
    async generateCapabilityMatrixSpreadsheet(
      options: CapabilityMatrixExportOptions & { filePath: string },
    ) {
      const buffer = buildCapabilityMatrixXlsxBuffer(options);
      await mkdir(path.dirname(options.filePath), { recursive: true });
      await writeFile(options.filePath, buffer);
      return options.filePath;
    },
    async parseCapabilityMatrixSpreadsheet(filePath: string): Promise<ParsedCapabilityMatrixSheet> {
      const buffer = await readFile(filePath);
      return parseCapabilityMatrixXlsxBuffer(buffer);
    },
  };
}
