// @vitest-environment node
import { access, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDesktopStore, type StoredRequirementRow } from './store';

const tempDirs: string[] = [];

const waitForNextTick = async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
};

const createTempStore = async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cmm-desktop-store-'));
  tempDirs.push(dir);

  const store = createDesktopStore(dir);
  await store.initDatabase();

  return { dir, store };
};

const sampleRows: StoredRequirementRow[] = [
  {
    id: 'row-1',
    text: 'Project overview',
    level: 0,
    position: 0,
  },
  {
    id: 'row-2',
    text: 'Target users',
    level: 1,
    position: 1,
  },
  {
    id: 'row-3',
    text: 'Success metrics',
    level: 1,
    position: 2,
  },
];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe('createDesktopStore', () => {
  it('creates projects, persists requirements, and updates last opened timestamps', async () => {
    const { dir, store } = await createTempStore();

    await expect(store.createProject('   ')).rejects.toThrow('Project name is required.');

    const created = await store.createProject('  Launch Matrix  ');
    expect(created.name).toBe('Launch Matrix');

    await store.saveProjectRequirements(created.id, sampleRows);
    const loadedRows = await store.loadProjectRequirements(created.id);
    expect(loadedRows).toEqual(sampleRows);

    await waitForNextTick();
    await store.touchProject(created.id);

    const projects = await store.listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe(created.id);
    expect(new Date(projects[0]?.lastOpenedAt ?? 0).getTime()).toBeGreaterThan(
      new Date(created.lastOpenedAt ?? 0).getTime(),
    );

    const reopenedStore = createDesktopStore(dir);
    const reopenedProjects = await reopenedStore.listProjects();
    const reopenedRows = await reopenedStore.loadProjectRequirements(created.id);
    expect(reopenedProjects).toHaveLength(1);
    expect(reopenedProjects[0]?.name).toBe('Launch Matrix');
    expect(reopenedRows).toEqual(sampleRows);
  });

  it('seeds sample projects only once', async () => {
    const { store } = await createTempStore();

    const firstInsertCount = await store.seedSampleProjects('compact');
    const secondInsertCount = await store.seedSampleProjects('compact');
    const projects = await store.listProjects();

    expect(firstInsertCount).toBeGreaterThan(0);
    expect(secondInsertCount).toBe(0);
    expect(projects).toHaveLength(firstInsertCount);
    expect(projects.every((project) => project.name.startsWith('Sample - '))).toBe(true);
  });

  it('archives prior imports for the same company and removes import rows on project delete', async () => {
    const { store } = await createTempStore();
    const project = await store.createProject('Vendor Review');

    await expect(
      store.saveCapabilityImportWithRows({
        projectId: project.id,
        companyName: '   ',
        rows: [],
      }),
    ).rejects.toThrow('Company name is required.');

    const firstImport = await store.saveCapabilityImportWithRows({
      projectId: project.id,
      companyName: 'Vendor A',
      sourceFilename: 'vendor-a.xlsx',
      rows: [
        {
          requirementId: 'row-1',
          requirementNumber: '1',
          requirementText: 'Project overview',
          score: 3,
          comments: 'Strong response',
        },
      ],
    });

    await waitForNextTick();
    const secondImport = await store.saveCapabilityImportWithRows({
      projectId: project.id,
      companyName: 'Vendor A',
      sourceFilename: 'vendor-a-revision.xlsx',
      rows: [
        {
          requirementId: 'row-1',
          requirementNumber: '1',
          requirementText: 'Project overview',
          score: 2,
          pastPerformance: 'Relevant delivery history',
        },
      ],
    });

    const activeImports = await store.listCapabilityImports(project.id);
    const allImports = await store.listCapabilityImports(project.id, true);
    const activeRows = await store.listCapabilityImportRows(secondImport.id);

    expect(activeImports).toHaveLength(1);
    expect(activeImports[0]?.id).toBe(secondImport.id);
    expect(allImports).toHaveLength(2);
    expect(
      allImports.some((entry) => entry.id === firstImport.id && entry.archivedAt !== null),
    ).toBe(true);
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0]?.score).toBe(2);

    await store.deleteProjects([project.id]);

    expect(await store.listProjects()).toHaveLength(0);
    expect(await store.loadProjectRequirements(project.id)).toEqual([]);
    expect(await store.listCapabilityImports(project.id, true)).toEqual([]);
    expect(await store.listCapabilityImportRows(secondImport.id)).toEqual([]);
  });

  it('writes and parses capability matrix spreadsheets through the filesystem adapter', async () => {
    const { dir, store } = await createTempStore();
    const filePath = path.join(dir, 'exports', 'capability-matrix.xlsx');

    const savedFilePath = await store.generateCapabilityMatrixSpreadsheet({
      title: 'Desktop Export',
      legend: {
        3: 'Excellent capability',
        2: 'Good capability',
        1: 'Partial capability',
        0: 'No capability',
      },
      rows: [
        {
          number: '1',
          text: 'Project overview',
          score: 3,
          pastPerformance: 'Delivered three similar programs',
          comments: 'Good fit',
        },
        {
          number: '1.1',
          text: 'Target users',
          score: 2,
        },
      ],
      filePath,
    });

    expect(savedFilePath).toBe(filePath);
    await expect(access(filePath)).resolves.toBeUndefined();

    const parsed = await store.parseCapabilityMatrixSpreadsheet(filePath);
    expect(parsed.title).toBe('Desktop Export');
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      number: '1',
      text: 'Project overview',
      score: 3,
      pastPerformance: 'Delivered three similar programs',
      comments: 'Good fit',
    });
  });
});
