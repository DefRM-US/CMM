// @vitest-environment node

import type { OpportunityService } from '@cmm/application';
import { cmmIpcContracts } from '@cmm/contracts';
import type { Opportunity } from '@cmm/domain';
import { describe, expect, it, vi } from 'vitest';
import { type IpcMainLike, registerCmmIpcHandlers } from './cmm-ipc';

type Handler = (event: unknown, input?: unknown) => Promise<unknown>;

class FakeIpcMain implements IpcMainLike {
  readonly handlers = new Map<string, Handler>();

  handle(channel: string, handler: Handler): void {
    this.handlers.set(channel, handler);
  }
}

const opportunity: Opportunity = {
  id: 'opportunity-1',
  name: 'Arctic Radar Upgrade',
  solicitationNumber: null,
  issuingAgency: null,
  description: null,
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-05-01T09:00:00.000Z',
  lastOpenedAt: null,
  archivedAt: null,
};

const baseCapabilityMatrix = {
  opportunityId: opportunity.id,
  revision: 1,
  requirements: [
    {
      id: 'requirement-1',
      text: 'Provide secure hosting',
      level: 1,
      position: 0,
      retiredAt: null,
    },
  ],
};

describe('registerCmmIpcHandlers', () => {
  it('registers validated Opportunity handlers without exposing raw IPC to the renderer', async () => {
    const ipcMain = new FakeIpcMain();
    const opportunityService: OpportunityService = {
      createOpportunity: vi.fn(async () => opportunity),
      listActiveOpportunities: vi.fn(async () => [opportunity]),
      listArchivedOpportunities: vi.fn(async () => [
        {
          ...opportunity,
          archivedAt: '2026-05-01T09:10:00.000Z',
        },
      ]),
      openOpportunity: vi.fn(async () => ({
        opportunity: {
          ...opportunity,
          lastOpenedAt: '2026-05-01T09:05:00.000Z',
        },
        baseCapabilityMatrix,
      })),
      openArchivedOpportunity: vi.fn(async () => ({
        opportunity: {
          ...opportunity,
          archivedAt: '2026-05-01T09:10:00.000Z',
        },
        baseCapabilityMatrix,
      })),
      saveBaseCapabilityMatrix: vi.fn(async () => baseCapabilityMatrix),
      archiveOpportunity: vi.fn(async () => ({
        ...opportunity,
        archivedAt: '2026-05-01T09:10:00.000Z',
      })),
      restoreArchivedOpportunity: vi.fn(async () => opportunity),
      hardDeleteArchivedOpportunity: vi.fn(async () => undefined),
    };

    registerCmmIpcHandlers(ipcMain, { opportunityService });

    expect(Array.from(ipcMain.handlers.keys()).sort()).toEqual(
      [
        cmmIpcContracts.createOpportunity.channel,
        cmmIpcContracts.listActiveOpportunities.channel,
        cmmIpcContracts.listArchivedOpportunities.channel,
        cmmIpcContracts.openOpportunity.channel,
        cmmIpcContracts.openArchivedOpportunity.channel,
        cmmIpcContracts.saveBaseCapabilityMatrix.channel,
        cmmIpcContracts.archiveOpportunity.channel,
        cmmIpcContracts.restoreArchivedOpportunity.channel,
        cmmIpcContracts.hardDeleteArchivedOpportunity.channel,
      ].sort(),
    );

    const createHandler = ipcMain.handlers.get(cmmIpcContracts.createOpportunity.channel);
    expect(createHandler).toBeDefined();
    await expect(createHandler?.({}, { name: '   ' })).rejects.toThrow(
      'Opportunity name is required.',
    );
    await expect(createHandler?.({}, { name: 'Arctic Radar Upgrade' })).resolves.toEqual(
      opportunity,
    );
    expect(opportunityService.createOpportunity).toHaveBeenCalledWith({
      name: 'Arctic Radar Upgrade',
    });

    const archiveHandler = ipcMain.handlers.get(cmmIpcContracts.archiveOpportunity.channel);
    await expect(archiveHandler?.({}, { opportunityId: 'opportunity-1' })).resolves.toEqual({
      ...opportunity,
      archivedAt: '2026-05-01T09:10:00.000Z',
    });
    expect(opportunityService.archiveOpportunity).toHaveBeenCalledWith({
      opportunityId: 'opportunity-1',
    });

    const saveMatrixHandler = ipcMain.handlers.get(
      cmmIpcContracts.saveBaseCapabilityMatrix.channel,
    );
    await expect(
      saveMatrixHandler?.({}, { ...baseCapabilityMatrix, requirements: [{ id: 'bad' }] }),
    ).rejects.toThrow();
    await expect(saveMatrixHandler?.({}, baseCapabilityMatrix)).resolves.toEqual(
      baseCapabilityMatrix,
    );
    expect(opportunityService.saveBaseCapabilityMatrix).toHaveBeenCalledWith(baseCapabilityMatrix);

    const hardDeleteHandler = ipcMain.handlers.get(
      cmmIpcContracts.hardDeleteArchivedOpportunity.channel,
    );
    await expect(hardDeleteHandler?.({}, { opportunityId: 'opportunity-1' })).resolves.toEqual({
      opportunityId: 'opportunity-1',
    });
    expect(opportunityService.hardDeleteArchivedOpportunity).toHaveBeenCalledWith({
      opportunityId: 'opportunity-1',
    });
  });
});
