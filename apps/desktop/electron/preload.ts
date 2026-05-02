import {
  type CreateOpportunityIpcInput,
  cmmIpcContracts,
  cmmWindowLifecycleChannels,
  type ExportBaseCapabilityMatrixIpcInput,
  type OpenOpportunityIpcInput,
  type OpportunityLifecycleIpcInput,
  type SaveBaseCapabilityMatrixIpcInput,
  validateWindowCloseRequest,
  type WindowCloseResponseDto,
} from '@cmm/contracts';
import { contextBridge, type IpcRendererEvent, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('cmmApi', {
  createOpportunity: (input: CreateOpportunityIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.createOpportunity.channel, input),
  listActiveOpportunities: () =>
    ipcRenderer.invoke(cmmIpcContracts.listActiveOpportunities.channel),
  listArchivedOpportunities: () =>
    ipcRenderer.invoke(cmmIpcContracts.listArchivedOpportunities.channel),
  openOpportunity: (input: OpenOpportunityIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.openOpportunity.channel, input),
  openArchivedOpportunity: (input: OpportunityLifecycleIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.openArchivedOpportunity.channel, input),
  saveBaseCapabilityMatrix: (input: SaveBaseCapabilityMatrixIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.saveBaseCapabilityMatrix.channel, input),
  exportBaseCapabilityMatrix: (input: ExportBaseCapabilityMatrixIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.exportBaseCapabilityMatrix.channel, input),
  archiveOpportunity: (input: OpportunityLifecycleIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.archiveOpportunity.channel, input),
  restoreArchivedOpportunity: (input: OpportunityLifecycleIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.restoreArchivedOpportunity.channel, input),
  hardDeleteArchivedOpportunity: (input: OpportunityLifecycleIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.hardDeleteArchivedOpportunity.channel, input),
  onWindowCloseRequest: (handler: () => boolean | Promise<boolean>) => {
    const listener = (_event: IpcRendererEvent, rawRequest: unknown) => {
      const request = validateWindowCloseRequest(rawRequest);
      void Promise.resolve(handler())
        .then((canClose) => {
          const response: WindowCloseResponseDto = {
            requestId: request.requestId,
            canClose,
          };
          ipcRenderer.send(cmmWindowLifecycleChannels.respondClose, response);
        })
        .catch(() => {
          const response: WindowCloseResponseDto = {
            requestId: request.requestId,
            canClose: false,
          };
          ipcRenderer.send(cmmWindowLifecycleChannels.respondClose, response);
        });
    };

    ipcRenderer.on(cmmWindowLifecycleChannels.requestClose, listener);
    return () => ipcRenderer.removeListener(cmmWindowLifecycleChannels.requestClose, listener);
  },
});
