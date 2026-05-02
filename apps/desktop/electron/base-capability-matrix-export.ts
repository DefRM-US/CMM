import path from 'node:path';
import type { OpportunityService } from '@cmm/application';
import type {
  ExportBaseCapabilityMatrixIpcInput,
  ExportBaseCapabilityMatrixIpcOutput,
} from '@cmm/contracts';

export type SaveDialogResult = {
  canceled: boolean;
  filePath?: string;
};

export type SaveDialog = (options: {
  title: string;
  defaultPath: string;
  filters: { name: string; extensions: string[] }[];
}) => Promise<SaveDialogResult>;

export type WriteFile = (filePath: string, data: Uint8Array) => Promise<void>;

export type BaseCapabilityMatrixExportFileService = {
  exportBaseCapabilityMatrix(
    input: ExportBaseCapabilityMatrixIpcInput,
  ): Promise<ExportBaseCapabilityMatrixIpcOutput>;
};

export type CreateBaseCapabilityMatrixExportFileServiceOptions = {
  opportunityService: OpportunityService;
  showSaveDialog: SaveDialog;
  writeFile: WriteFile;
};

export const createBaseCapabilityMatrixExportFileService = ({
  opportunityService,
  showSaveDialog,
  writeFile,
}: CreateBaseCapabilityMatrixExportFileServiceOptions): BaseCapabilityMatrixExportFileService => ({
  async exportBaseCapabilityMatrix(input) {
    const exportResult = await opportunityService.exportBaseCapabilityMatrix(input);
    const saveDialogResult = await showSaveDialog({
      title: 'Export Base Capability Matrix',
      defaultPath: exportResult.suggestedFilename,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
    });

    if (saveDialogResult.canceled || !saveDialogResult.filePath) {
      return {
        status: 'canceled',
        filename: null,
      };
    }

    await writeFile(saveDialogResult.filePath, exportResult.workbook);
    return {
      status: 'exported',
      filename: path.basename(saveDialogResult.filePath),
    };
  },
});
