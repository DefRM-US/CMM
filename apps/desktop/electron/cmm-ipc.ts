import type { OpportunityService } from '@cmm/application';
import {
  cmmIpcContracts,
  type IpcContract,
  validateIpcInput,
  validateIpcOutput,
} from '@cmm/contracts';

type IpcHandler = (event: unknown, input?: unknown) => Promise<unknown> | unknown;

export type IpcMainLike = {
  handle(channel: string, handler: IpcHandler): void;
};

export type CmmIpcServices = {
  opportunityService: OpportunityService;
};

const registerValidatedHandler = <Input, Output>(
  ipcMain: IpcMainLike,
  contract: IpcContract<Input, Output>,
  handler: (input: Input) => Promise<Output> | Output,
): void => {
  ipcMain.handle(contract.channel, async (_event, rawInput) => {
    const input = validateIpcInput(contract, rawInput);
    const output = await handler(input);
    return validateIpcOutput(contract, output);
  });
};

export const registerCmmIpcHandlers = (
  ipcMain: IpcMainLike,
  { opportunityService }: CmmIpcServices,
): void => {
  registerValidatedHandler(ipcMain, cmmIpcContracts.createOpportunity, (input) =>
    opportunityService.createOpportunity(input),
  );
  registerValidatedHandler(ipcMain, cmmIpcContracts.listActiveOpportunities, () =>
    opportunityService.listActiveOpportunities(),
  );
  registerValidatedHandler(ipcMain, cmmIpcContracts.listArchivedOpportunities, () =>
    opportunityService.listArchivedOpportunities(),
  );
  registerValidatedHandler(ipcMain, cmmIpcContracts.openOpportunity, (input) =>
    opportunityService.openOpportunity(input),
  );
  registerValidatedHandler(ipcMain, cmmIpcContracts.openArchivedOpportunity, (input) =>
    opportunityService.openArchivedOpportunity(input),
  );
  registerValidatedHandler(ipcMain, cmmIpcContracts.archiveOpportunity, (input) =>
    opportunityService.archiveOpportunity(input),
  );
  registerValidatedHandler(ipcMain, cmmIpcContracts.restoreArchivedOpportunity, (input) =>
    opportunityService.restoreArchivedOpportunity(input),
  );
  registerValidatedHandler(
    ipcMain,
    cmmIpcContracts.hardDeleteArchivedOpportunity,
    async (input) => {
      await opportunityService.hardDeleteArchivedOpportunity(input);
      return {
        opportunityId: input.opportunityId,
      };
    },
  );
};
