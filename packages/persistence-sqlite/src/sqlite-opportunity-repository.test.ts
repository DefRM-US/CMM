import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createOpportunityService } from '@cmm/application';
import type { IsoDateTime } from '@cmm/domain';
import { afterEach, describe, expect, it } from 'vitest';
import { createCmmSqliteDatabase, createSqliteOpportunityRepository } from './index';

const tempDirs: string[] = [];

const createClock = (timestamps: IsoDateTime[]) => {
  let index = 0;
  return {
    now(): IsoDateTime {
      const timestamp = timestamps[index];
      if (!timestamp) {
        throw new Error('No timestamp configured for test clock.');
      }
      index += 1;
      return timestamp;
    },
  };
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('SQLite Opportunity repository', () => {
  it('persists created and opened Opportunities across database connections', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cmm-sqlite-opportunities-'));
    tempDirs.push(dir);
    const databasePath = path.join(dir, 'cmm.sqlite');

    const firstDatabase = createCmmSqliteDatabase(databasePath);
    const firstService = createOpportunityService({
      repository: createSqliteOpportunityRepository(firstDatabase),
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-01T09:05:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await firstService.createOpportunity({
      name: 'Maritime Logistics Support',
      solicitationNumber: 'MLS-26',
      issuingAgency: 'Defense Logistics Agency',
      description: '',
    });
    const opened = await firstService.openOpportunity({ opportunityId: created.id });
    firstDatabase.close();

    const secondDatabase = createCmmSqliteDatabase(databasePath);
    const secondService = createOpportunityService({
      repository: createSqliteOpportunityRepository(secondDatabase),
      clock: createClock(['2026-05-01T10:00:00.000Z']),
      ids: { next: () => 'unused' },
    });

    await expect(secondService.listActiveOpportunities()).resolves.toEqual([
      {
        ...opened.opportunity,
        description: null,
      },
    ]);
    secondDatabase.close();
  });

  it('persists archived Opportunities across database connections', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cmm-sqlite-opportunities-'));
    tempDirs.push(dir);
    const databasePath = path.join(dir, 'cmm.sqlite');

    const firstDatabase = createCmmSqliteDatabase(databasePath);
    const firstService = createOpportunityService({
      repository: createSqliteOpportunityRepository(firstDatabase),
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-01T09:10:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await firstService.createOpportunity({
      name: 'Maritime Logistics Support',
      solicitationNumber: 'MLS-26',
      issuingAgency: 'Defense Logistics Agency',
      description: 'Local-first pursuit workspace for consortium planning.',
    });
    const archived = await firstService.archiveOpportunity({ opportunityId: created.id });
    firstDatabase.close();

    const secondDatabase = createCmmSqliteDatabase(databasePath);
    const secondService = createOpportunityService({
      repository: createSqliteOpportunityRepository(secondDatabase),
      clock: createClock(['2026-05-01T10:00:00.000Z']),
      ids: { next: () => 'unused' },
    });

    await expect(secondService.listActiveOpportunities()).resolves.toEqual([]);
    await expect(secondService.listArchivedOpportunities()).resolves.toEqual([archived]);
    secondDatabase.close();
  });

  it('persists restored Opportunities across database connections', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cmm-sqlite-opportunities-'));
    tempDirs.push(dir);
    const databasePath = path.join(dir, 'cmm.sqlite');

    const firstDatabase = createCmmSqliteDatabase(databasePath);
    const firstService = createOpportunityService({
      repository: createSqliteOpportunityRepository(firstDatabase),
      clock: createClock([
        '2026-05-01T09:00:00.000Z',
        '2026-05-01T09:10:00.000Z',
        '2026-05-01T09:20:00.000Z',
      ]),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await firstService.createOpportunity({
      name: 'Maritime Logistics Support',
      solicitationNumber: 'MLS-26',
      issuingAgency: 'Defense Logistics Agency',
      description: 'Local-first pursuit workspace for consortium planning.',
    });
    await firstService.archiveOpportunity({ opportunityId: created.id });
    const restored = await firstService.restoreArchivedOpportunity({ opportunityId: created.id });
    firstDatabase.close();

    const secondDatabase = createCmmSqliteDatabase(databasePath);
    const secondService = createOpportunityService({
      repository: createSqliteOpportunityRepository(secondDatabase),
      clock: createClock(['2026-05-01T10:00:00.000Z']),
      ids: { next: () => 'unused' },
    });

    await expect(secondService.listActiveOpportunities()).resolves.toEqual([restored]);
    await expect(secondService.listArchivedOpportunities()).resolves.toEqual([]);
    secondDatabase.close();
  });

  it('persists Base Capability Matrix Requirements across database connections', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cmm-sqlite-base-matrix-'));
    tempDirs.push(dir);
    const databasePath = path.join(dir, 'cmm.sqlite');

    const firstDatabase = createCmmSqliteDatabase(databasePath);
    const firstService = createOpportunityService({
      repository: createSqliteOpportunityRepository(firstDatabase),
      clock: createClock(['2026-05-01T09:00:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await firstService.createOpportunity({
      name: 'Maritime Logistics Support',
    });
    const saved = await firstService.saveBaseCapabilityMatrix({
      opportunityId: created.id,
      revision: 0,
      requirements: [
        {
          id: 'requirement-1',
          text: 'Provide secure hosting',
          level: 1,
          position: 0,
          retiredAt: null,
        },
        {
          id: 'requirement-2',
          text: 'Retired draft Requirement',
          level: 2,
          position: 1,
          retiredAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    });
    firstDatabase.close();

    const secondDatabase = createCmmSqliteDatabase(databasePath);
    const secondService = createOpportunityService({
      repository: createSqliteOpportunityRepository(secondDatabase),
      clock: createClock(['2026-05-01T10:00:00.000Z']),
      ids: { next: () => 'unused' },
    });

    await expect(secondService.openOpportunity({ opportunityId: created.id })).resolves.toEqual({
      opportunity: {
        ...created,
        lastOpenedAt: '2026-05-01T10:00:00.000Z',
      },
      baseCapabilityMatrix: saved,
    });
    secondDatabase.close();
  });

  it('removes hard-deleted archived Opportunities across database connections', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cmm-sqlite-opportunities-'));
    tempDirs.push(dir);
    const databasePath = path.join(dir, 'cmm.sqlite');

    const firstDatabase = createCmmSqliteDatabase(databasePath);
    const firstService = createOpportunityService({
      repository: createSqliteOpportunityRepository(firstDatabase),
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-01T09:10:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await firstService.createOpportunity({
      name: 'Maritime Logistics Support',
    });
    await firstService.archiveOpportunity({ opportunityId: created.id });
    await firstService.hardDeleteArchivedOpportunity({ opportunityId: created.id });
    firstDatabase.close();

    const secondDatabase = createCmmSqliteDatabase(databasePath);
    const secondService = createOpportunityService({
      repository: createSqliteOpportunityRepository(secondDatabase),
      clock: createClock(['2026-05-01T10:00:00.000Z']),
      ids: { next: () => 'unused' },
    });

    await expect(secondService.listActiveOpportunities()).resolves.toEqual([]);
    await expect(secondService.listArchivedOpportunities()).resolves.toEqual([]);
    secondDatabase.close();
  });

  it('rejects hard delete for active Opportunities at the repository boundary', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'cmm-sqlite-opportunities-'));
    tempDirs.push(dir);
    const databasePath = path.join(dir, 'cmm.sqlite');

    const database = createCmmSqliteDatabase(databasePath);
    const repository = createSqliteOpportunityRepository(database);
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({
      name: 'Maritime Logistics Support',
    });

    await expect(repository.hardDeleteArchivedOpportunity(created.id)).rejects.toThrow(
      'Opportunity not found.',
    );
    await expect(service.listActiveOpportunities()).resolves.toEqual([created]);
    database.close();
  });
});
