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

describe('registerCmmIpcHandlers', () => {
  it('registers validated Opportunity handlers without exposing raw IPC to the renderer', async () => {
    const ipcMain = new FakeIpcMain();
    const opportunityService: OpportunityService = {
      createOpportunity: vi.fn(async () => opportunity),
      listActiveOpportunities: vi.fn(async () => [opportunity]),
      openOpportunity: vi.fn(async () => ({
        opportunity: {
          ...opportunity,
          lastOpenedAt: '2026-05-01T09:05:00.000Z',
        },
        baseCapabilityMatrix: {
          opportunityId: opportunity.id,
          requirements: [],
        },
      })),
    };

    registerCmmIpcHandlers(ipcMain, { opportunityService });

    expect(Array.from(ipcMain.handlers.keys()).sort()).toEqual(
      [
        cmmIpcContracts.createOpportunity.channel,
        cmmIpcContracts.listActiveOpportunities.channel,
        cmmIpcContracts.openOpportunity.channel,
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
  });
});
