import { describe, expect, it } from 'vitest';
import {
  cmmIpcContracts,
  cmmWindowLifecycleChannels,
  validateIpcInput,
  validateIpcOutput,
  validateWindowCloseRequest,
  validateWindowCloseResponse,
} from './index';

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

const baseCapabilityMatrix = {
  opportunityId: 'opportunity-1',
  revision: 1,
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
    expect(cmmIpcContracts.saveBaseCapabilityMatrix.channel).toBe('cmm:base-matrices:save');
    expect(cmmIpcContracts.exportBaseCapabilityMatrix.channel).toBe('cmm:base-matrices:export');
    expect(cmmWindowLifecycleChannels.requestClose).toBe('cmm:window:request-close');
    expect(cmmWindowLifecycleChannels.respondClose).toBe('cmm:window:respond-close');

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
        baseCapabilityMatrix,
      }),
    ).toEqual({
      opportunity,
      baseCapabilityMatrix,
    });
    expect(
      validateIpcOutput(cmmIpcContracts.openArchivedOpportunity, {
        opportunity: {
          ...opportunity,
          archivedAt: '2026-05-01T09:10:00.000Z',
        },
        baseCapabilityMatrix,
      }),
    ).toEqual({
      opportunity: {
        ...opportunity,
        archivedAt: '2026-05-01T09:10:00.000Z',
      },
      baseCapabilityMatrix,
    });
    expect(
      validateIpcInput(cmmIpcContracts.saveBaseCapabilityMatrix, baseCapabilityMatrix),
    ).toEqual(baseCapabilityMatrix);
    expect(() =>
      validateIpcInput(cmmIpcContracts.saveBaseCapabilityMatrix, {
        ...baseCapabilityMatrix,
        requirements: [
          {
            ...baseCapabilityMatrix.requirements[0],
            level: 0,
          },
        ],
      }),
    ).toThrow();
    expect(
      validateIpcOutput(cmmIpcContracts.saveBaseCapabilityMatrix, baseCapabilityMatrix),
    ).toEqual(baseCapabilityMatrix);
    expect(
      validateIpcInput(cmmIpcContracts.exportBaseCapabilityMatrix, {
        opportunityId: 'opportunity-1',
        includeBlankRequirements: true,
        includeRetiredRequirements: false,
      }),
    ).toEqual({
      opportunityId: 'opportunity-1',
      includeBlankRequirements: true,
      includeRetiredRequirements: false,
    });
    expect(
      validateIpcOutput(cmmIpcContracts.exportBaseCapabilityMatrix, {
        status: 'exported',
        filename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
      }),
    ).toEqual({
      status: 'exported',
      filename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
    });
    expect(
      validateIpcOutput(cmmIpcContracts.exportBaseCapabilityMatrix, {
        status: 'canceled',
        filename: null,
      }),
    ).toEqual({
      status: 'canceled',
      filename: null,
    });
    expect(() =>
      validateIpcOutput(cmmIpcContracts.exportBaseCapabilityMatrix, {
        status: 'exported',
        filename: null,
      }),
    ).toThrow();
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
    expect(validateWindowCloseRequest({ requestId: 'close-1' })).toEqual({
      requestId: 'close-1',
    });
    expect(validateWindowCloseResponse({ requestId: 'close-1', canClose: false })).toEqual({
      requestId: 'close-1',
      canClose: false,
    });
    expect(() => validateWindowCloseResponse({ requestId: '', canClose: true })).toThrow();
  });
});
