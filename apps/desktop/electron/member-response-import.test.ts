// @vitest-environment node

import { ApplicationError, type OpportunityService } from '@cmm/application';
import { describe, expect, it, vi } from 'vitest';
import { createMemberResponseImportFileService } from './member-response-import';

const parsedWorkbook = {
  metadata: {
    workbookFormatVersion: '1',
    opportunityId: 'opportunity-1',
    exportTimestamp: '2026-05-02T10:00:00.000Z',
  },
  workbookTitle: 'Arctic Radar Upgrade',
  memberName: 'Polar Systems LLC',
  rows: [
    {
      requirementId: 'requirement-1',
      requirementNumber: '1',
      requirementText: 'Provide secure hosting',
      capabilityScore: 3 as const,
      pastPerformanceReference: 'Hosted IL5 workloads',
      responseComment: 'Available immediately',
    },
  ],
};

const importPreview = {
  opportunityId: 'opportunity-1',
  sourceFilename: 'Polar Systems response.xlsx',
  workbookTitle: 'Arctic Radar Upgrade',
  suggestedMemberName: 'Polar Systems LLC',
  rows: [
    {
      requirementId: 'requirement-1',
      requirementNumber: '1',
      requirementText: 'Provide secure hosting',
      requirementRetiredAt: null,
      capabilityScore: 3 as const,
      pastPerformanceReference: 'Hosted IL5 workloads',
      responseComment: 'Available immediately',
    },
  ],
};

const opportunityService = (): OpportunityService => ({
  createOpportunity: vi.fn(),
  listActiveOpportunities: vi.fn(),
  listArchivedOpportunities: vi.fn(),
  openOpportunity: vi.fn(),
  openArchivedOpportunity: vi.fn(),
  saveBaseCapabilityMatrix: vi.fn(),
  exportBaseCapabilityMatrix: vi.fn(),
  previewMemberResponseImport: vi.fn(async () => importPreview),
  saveMemberResponseImport: vi.fn(),
  archiveOpportunity: vi.fn(),
  restoreArchivedOpportunity: vi.fn(),
  hardDeleteArchivedOpportunity: vi.fn(),
});

describe('Member Response import file service', () => {
  it('selects a workbook through main-owned file IO and parses workbook bytes', async () => {
    const service = opportunityService();
    const readFile = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const parseMemberResponseWorkbook = vi.fn(async () => parsedWorkbook);
    const importFileService = createMemberResponseImportFileService({
      opportunityService: service,
      showOpenDialog: vi.fn(async () => ({
        canceled: false,
        filePaths: ['/tmp/Polar Systems response.xlsx'],
      })),
      readFile,
      parseMemberResponseWorkbook,
    });

    await expect(
      importFileService.selectMemberResponseWorkbookForImport({
        opportunityId: 'opportunity-1',
      }),
    ).resolves.toEqual({
      status: 'readyForReview',
      preview: importPreview,
    });
    expect(readFile).toHaveBeenCalledWith('/tmp/Polar Systems response.xlsx');
    expect(parseMemberResponseWorkbook).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    expect(service.previewMemberResponseImport).toHaveBeenCalledWith({
      opportunityId: 'opportunity-1',
      sourceFilename: 'Polar Systems response.xlsx',
      parsedWorkbook,
    });
  });

  it('does not read a workbook when the import dialog is canceled', async () => {
    const readFile = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const importFileService = createMemberResponseImportFileService({
      opportunityService: opportunityService(),
      showOpenDialog: vi.fn(async () => ({
        canceled: true,
        filePaths: [],
      })),
      readFile,
      parseMemberResponseWorkbook: vi.fn(async () => parsedWorkbook),
    });

    await expect(
      importFileService.selectMemberResponseWorkbookForImport({
        opportunityId: 'opportunity-1',
      }),
    ).resolves.toEqual({
      status: 'canceled',
      preview: null,
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  it('returns a typed rejection when the workbook has no usable Member Response rows', async () => {
    const service = opportunityService();
    vi.mocked(service.previewMemberResponseImport).mockRejectedValue(
      new ApplicationError(
        'memberResponse.noUsableRows',
        'Member Response workbook has no usable response rows.',
      ),
    );
    const importFileService = createMemberResponseImportFileService({
      opportunityService: service,
      showOpenDialog: vi.fn(async () => ({
        canceled: false,
        filePaths: ['/tmp/empty response.xlsx'],
      })),
      readFile: vi.fn(async () => new Uint8Array([1, 2, 3])),
      parseMemberResponseWorkbook: vi.fn(async () => parsedWorkbook),
    });

    await expect(
      importFileService.selectMemberResponseWorkbookForImport({
        opportunityId: 'opportunity-1',
      }),
    ).resolves.toEqual({
      status: 'rejected',
      error: { code: 'memberResponse.noUsableRows' },
      preview: null,
    });
  });
});
