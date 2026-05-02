// @vitest-environment node

import type { OpportunityService } from '@cmm/application';
import { describe, expect, it, vi } from 'vitest';
import { createBaseCapabilityMatrixExportFileService } from './base-capability-matrix-export';

const opportunityService = (): OpportunityService => ({
  createOpportunity: vi.fn(),
  listActiveOpportunities: vi.fn(),
  listArchivedOpportunities: vi.fn(),
  openOpportunity: vi.fn(),
  openArchivedOpportunity: vi.fn(),
  saveBaseCapabilityMatrix: vi.fn(),
  exportBaseCapabilityMatrix: vi.fn(async () => ({
    workbook: new Uint8Array([1, 2, 3]),
    suggestedFilename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
    exportTimestamp: '2026-05-02T10:00:00.000Z',
  })),
  previewMemberResponseImport: vi.fn(),
  saveMemberResponseImport: vi.fn(),
  archiveOpportunity: vi.fn(),
  restoreArchivedOpportunity: vi.fn(),
  hardDeleteArchivedOpportunity: vi.fn(),
});

describe('Base Capability Matrix export file service', () => {
  it('writes exported workbook buffers through main-owned file IO', async () => {
    const service = opportunityService();
    const writeFile = vi.fn(async () => undefined);
    const exportFileService = createBaseCapabilityMatrixExportFileService({
      opportunityService: service,
      showSaveDialog: vi.fn(async () => ({
        canceled: false,
        filePath: '/tmp/Arctic Radar Upgrade - Base Capability Matrix.xlsx',
      })),
      writeFile,
    });

    await expect(
      exportFileService.exportBaseCapabilityMatrix({
        opportunityId: 'opportunity-1',
        includeBlankRequirements: false,
        includeRetiredRequirements: false,
      }),
    ).resolves.toEqual({
      status: 'exported',
      filename: 'Arctic Radar Upgrade - Base Capability Matrix.xlsx',
    });
    expect(service.exportBaseCapabilityMatrix).toHaveBeenCalledWith({
      opportunityId: 'opportunity-1',
      includeBlankRequirements: false,
      includeRetiredRequirements: false,
    });
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/Arctic Radar Upgrade - Base Capability Matrix.xlsx',
      new Uint8Array([1, 2, 3]),
    );
  });

  it('does not write a workbook when the save dialog is canceled', async () => {
    const service = opportunityService();
    const writeFile = vi.fn(async () => undefined);
    const exportFileService = createBaseCapabilityMatrixExportFileService({
      opportunityService: service,
      showSaveDialog: vi.fn(async () => ({
        canceled: true,
      })),
      writeFile,
    });

    await expect(
      exportFileService.exportBaseCapabilityMatrix({
        opportunityId: 'opportunity-1',
        includeBlankRequirements: false,
        includeRetiredRequirements: false,
      }),
    ).resolves.toEqual({
      status: 'canceled',
      filename: null,
    });
    expect(writeFile).not.toHaveBeenCalled();
  });
});
