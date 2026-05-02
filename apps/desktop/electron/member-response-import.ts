import path from 'node:path';
import {
  ApplicationError,
  type OpportunityService,
  type ParsedMemberResponseWorkbook,
} from '@cmm/application';
import type {
  SelectMemberResponseWorkbookForImportIpcInput,
  SelectMemberResponseWorkbookForImportIpcOutput,
} from '@cmm/contracts';

export type OpenDialogResult = {
  canceled: boolean;
  filePaths: string[];
};

export type OpenDialog = (options: {
  title: string;
  properties: ['openFile'];
  filters: { name: string; extensions: string[] }[];
}) => Promise<OpenDialogResult>;

export type ReadFile = (filePath: string) => Promise<Uint8Array>;

export type ParseMemberResponseWorkbook = (
  buffer: Uint8Array,
) => Promise<ParsedMemberResponseWorkbook>;

export type MemberResponseImportFileService = {
  selectMemberResponseWorkbookForImport(
    input: SelectMemberResponseWorkbookForImportIpcInput,
  ): Promise<SelectMemberResponseWorkbookForImportIpcOutput>;
};

export type CreateMemberResponseImportFileServiceOptions = {
  opportunityService: OpportunityService;
  showOpenDialog: OpenDialog;
  readFile: ReadFile;
  parseMemberResponseWorkbook: ParseMemberResponseWorkbook;
};

export const createMemberResponseImportFileService = ({
  opportunityService,
  showOpenDialog,
  readFile,
  parseMemberResponseWorkbook,
}: CreateMemberResponseImportFileServiceOptions): MemberResponseImportFileService => ({
  async selectMemberResponseWorkbookForImport(input) {
    const openDialogResult = await showOpenDialog({
      title: 'Import Member Response',
      properties: ['openFile'],
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
    });

    const filePath = openDialogResult.filePaths[0];
    if (openDialogResult.canceled || !filePath) {
      return {
        status: 'canceled',
        preview: null,
      };
    }

    const workbook = await readFile(filePath);
    const parsedWorkbook = await parseMemberResponseWorkbook(workbook);
    try {
      const preview = await opportunityService.previewMemberResponseImport({
        opportunityId: input.opportunityId,
        sourceFilename: path.basename(filePath),
        parsedWorkbook,
      });

      return {
        status: 'readyForReview',
        preview,
      };
    } catch (error) {
      if (error instanceof ApplicationError && error.code === 'memberResponse.noUsableRows') {
        return {
          status: 'rejected',
          error: { code: error.code },
          preview: null,
        };
      }

      throw error;
    }
  },
});
