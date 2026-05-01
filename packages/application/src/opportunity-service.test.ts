import type { IsoDateTime, Opportunity, OpportunityId } from '@cmm/domain';
import { describe, expect, it } from 'vitest';
import { createOpportunityService, type OpportunityRepository } from './index';

class InMemoryOpportunityRepository implements OpportunityRepository {
  readonly opportunities = new Map<OpportunityId, Opportunity>();

  async saveOpportunity(opportunity: Opportunity): Promise<void> {
    this.opportunities.set(opportunity.id, opportunity);
  }

  async listActiveOpportunities(): Promise<Opportunity[]> {
    return Array.from(this.opportunities.values()).filter(
      (opportunity) => opportunity.archivedAt === null,
    );
  }

  async findActiveOpportunityById(opportunityId: OpportunityId): Promise<Opportunity | null> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity || opportunity.archivedAt !== null) {
      return null;
    }
    return opportunity;
  }

  async markOpportunityOpened(
    opportunityId: OpportunityId,
    lastOpenedAt: IsoDateTime,
  ): Promise<Opportunity> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error('Opportunity not found.');
    }
    const updated = { ...opportunity, lastOpenedAt };
    this.opportunities.set(opportunityId, updated);
    return updated;
  }
}

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

describe('OpportunityService', () => {
  it('creates, lists, and opens an Opportunity with an empty Base Capability Matrix', async () => {
    const repository = new InMemoryOpportunityRepository();
    const service = createOpportunityService({
      repository,
      clock: createClock(['2026-05-01T09:00:00.000Z', '2026-05-01T09:05:00.000Z']),
      ids: { next: () => 'opportunity-1' },
    });

    const created = await service.createOpportunity({
      name: '  Arctic Radar Upgrade  ',
      solicitationNumber: '  RFP-2026-17  ',
      issuingAgency: '  Naval Systems Command  ',
      description: '  Sensor modernization pursuit  ',
    });

    expect(created).toEqual({
      id: 'opportunity-1',
      name: 'Arctic Radar Upgrade',
      solicitationNumber: 'RFP-2026-17',
      issuingAgency: 'Naval Systems Command',
      description: 'Sensor modernization pursuit',
      createdAt: '2026-05-01T09:00:00.000Z',
      updatedAt: '2026-05-01T09:00:00.000Z',
      lastOpenedAt: null,
      archivedAt: null,
    });
    await expect(service.listActiveOpportunities()).resolves.toEqual([created]);

    const opened = await service.openOpportunity({ opportunityId: created.id });

    expect(opened).toEqual({
      opportunity: {
        ...created,
        lastOpenedAt: '2026-05-01T09:05:00.000Z',
      },
      baseCapabilityMatrix: {
        opportunityId: 'opportunity-1',
        requirements: [],
      },
    });
    await expect(service.listActiveOpportunities()).resolves.toEqual([opened.opportunity]);
  });
});
