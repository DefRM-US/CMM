import {
  type CreateOpportunityIpcInput,
  cmmIpcContracts,
  type OpenOpportunityIpcInput,
} from '@cmm/contracts';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('cmmApi', {
  createOpportunity: (input: CreateOpportunityIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.createOpportunity.channel, input),
  listActiveOpportunities: () =>
    ipcRenderer.invoke(cmmIpcContracts.listActiveOpportunities.channel),
  openOpportunity: (input: OpenOpportunityIpcInput) =>
    ipcRenderer.invoke(cmmIpcContracts.openOpportunity.channel, input),
});
