import {
  type CreateOpportunityIpcInput,
  cmmIpcContracts,
  type OpenOpportunityIpcInput,
  type OpportunityLifecycleIpcInput,
  type SaveBaseCapabilityMatrixIpcInput,
} from '@cmm/contracts';
import { contextBridge, ipcRenderer } from 'electron';

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
  archiveOpportunity: (input: OpportunityLifecycleIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.archiveOpportunity.channel, input),
  restoreArchivedOpportunity: (input: OpportunityLifecycleIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.restoreArchivedOpportunity.channel, input),
  hardDeleteArchivedOpportunity: (input: OpportunityLifecycleIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.hardDeleteArchivedOpportunity.channel, input),
});
