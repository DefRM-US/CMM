import { describe, expect, it } from 'vitest';
import { cmmIpcContracts, validateIpcInput, validateIpcOutput } from './index';

const opportunity = {
  id: 'opportunity-1',
  name: 'Arctic Radar Upgrade',
  solicitationNumber: 'RFP-2026-17',
  issuingAgency: 'Naval Systems Command',
  description: null,
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-05-01T09:00:00.000Z',
  lastOpenedAt: null,
  archivedAt: null,
};

describe('Opportunity IPC contracts', () => {
  it('validates create, list, and open Opportunity IPC payloads', () => {
    expect(cmmIpcContracts.createOpportunity.channel).toBe('cmm:opportunities:create');
    expect(cmmIpcContracts.listActiveOpportunities.channel).toBe('cmm:opportunities:list-active');
    expect(cmmIpcContracts.listArchivedOpportunities.channel).toBe(
      'cmm:opportunities:list-archived',
    );
    expect(cmmIpcContracts.openOpportunity.channel).toBe('cmm:opportunities:open');
    expect(cmmIpcContracts.openArchivedOpportunity.channel).toBe('cmm:opportunities:open-archived');
    expect(cmmIpcContracts.archiveOpportunity.channel).toBe('cmm:opportunities:archive');
    expect(cmmIpcContracts.restoreArchivedOpportunity.channel).toBe(
      'cmm:opportunities:restore-archived',
    );
    expect(cmmIpcContracts.hardDeleteArchivedOpportunity.channel).toBe(
      'cmm:opportunities:hard-delete-archived',
    );

    expect(
      validateIpcInput(cmmIpcContracts.createOpportunity, {
        name: 'Arctic Radar Upgrade',
        solicitationNumber: null,
      }),
    ).toEqual({
      name: 'Arctic Radar Upgrade',
      solicitationNumber: null,
    });
    expect(() => validateIpcInput(cmmIpcContracts.createOpportunity, { name: '   ' })).toThrow(
      'Opportunity name is required.',
    );
    expect(() => validateIpcInput(cmmIpcContracts.openOpportunity, { opportunityId: '' })).toThrow(
      'Opportunity ID is required.',
    );
    expect(
      validateIpcInput(cmmIpcContracts.archiveOpportunity, { opportunityId: 'opportunity-1' }),
    ).toEqual({
      opportunityId: 'opportunity-1',
    });
    expect(
      validateIpcInput(cmmIpcContracts.restoreArchivedOpportunity, {
        opportunityId: 'opportunity-1',
      }),
    ).toEqual({
      opportunityId: 'opportunity-1',
    });
    expect(
      validateIpcInput(cmmIpcContracts.hardDeleteArchivedOpportunity, {
        opportunityId: 'opportunity-1',
      }),
    ).toEqual({
      opportunityId: 'opportunity-1',
    });

    expect(validateIpcInput(cmmIpcContracts.listActiveOpportunities, undefined)).toBeUndefined();
    expect(validateIpcInput(cmmIpcContracts.listArchivedOpportunities, undefined)).toBeUndefined();
    expect(validateIpcOutput(cmmIpcContracts.listActiveOpportunities, [opportunity])).toEqual([
      opportunity,
    ]);
    expect(validateIpcOutput(cmmIpcContracts.listArchivedOpportunities, [opportunity])).toEqual([
      opportunity,
    ]);
    expect(
      validateIpcOutput(cmmIpcContracts.openOpportunity, {
        opportunity,
        baseCapabilityMatrix: {
          opportunityId: 'opportunity-1',
          requirements: [],
        },
      }),
    ).toEqual({
      opportunity,
      baseCapabilityMatrix: {
        opportunityId: 'opportunity-1',
        requirements: [],
      },
    });
    expect(
      validateIpcOutput(cmmIpcContracts.openArchivedOpportunity, {
        opportunity: {
          ...opportunity,
          archivedAt: '2026-05-01T09:10:00.000Z',
        },
        baseCapabilityMatrix: {
          opportunityId: 'opportunity-1',
          requirements: [],
        },
      }),
    ).toEqual({
      opportunity: {
        ...opportunity,
        archivedAt: '2026-05-01T09:10:00.000Z',
      },
      baseCapabilityMatrix: {
        opportunityId: 'opportunity-1',
        requirements: [],
      },
    });
    expect(validateIpcOutput(cmmIpcContracts.archiveOpportunity, opportunity)).toEqual(opportunity);
    expect(validateIpcOutput(cmmIpcContracts.restoreArchivedOpportunity, opportunity)).toEqual(
      opportunity,
    );
    expect(
      validateIpcOutput(cmmIpcContracts.hardDeleteArchivedOpportunity, {
        opportunityId: 'opportunity-1',
      }),
    ).toEqual({
      opportunityId: 'opportunity-1',
    });
  });
});
