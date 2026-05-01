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
});
