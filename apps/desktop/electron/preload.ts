import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopApi', {
  initDatabase: () => ipcRenderer.invoke('desktop:initDatabase'),
  listProjects: () => ipcRenderer.invoke('desktop:listProjects'),
  createProject: (name: string) => ipcRenderer.invoke('desktop:createProject', name),
  deleteProjects: (projectIds: string[]) =>
    ipcRenderer.invoke('desktop:deleteProjects', projectIds),
  seedSampleProjects: (size: 'compact' | 'medium' | 'large' = 'compact') =>
    ipcRenderer.invoke('desktop:seedSampleProjects', size),
  touchProject: (projectId: string) => ipcRenderer.invoke('desktop:touchProject', projectId),
  loadProjectRequirements: (projectId: string) =>
    ipcRenderer.invoke('desktop:loadProjectRequirements', projectId),
  saveProjectRequirements: (projectId: string, rows: unknown[]) =>
    ipcRenderer.invoke('desktop:saveProjectRequirements', projectId, rows),
  listCapabilityImports: (projectId: string, includeArchived = false) =>
    ipcRenderer.invoke('desktop:listCapabilityImports', projectId, includeArchived),
  listCapabilityImportRows: (importId: string) =>
    ipcRenderer.invoke('desktop:listCapabilityImportRows', importId),
  saveCapabilityImportWithRows: (input: unknown) =>
    ipcRenderer.invoke('desktop:saveCapabilityImportWithRows', input),
  showSaveDialog: (defaultFileName: string) =>
    ipcRenderer.invoke('desktop:showSaveDialog', defaultFileName),
  showOpenDialog: () => ipcRenderer.invoke('desktop:showOpenDialog'),
  generateCapabilityMatrixSpreadsheet: (options: unknown) =>
    ipcRenderer.invoke('desktop:generateCapabilityMatrixSpreadsheet', options),
  parseCapabilityMatrixSpreadsheet: (filePath: string) =>
    ipcRenderer.invoke('desktop:parseCapabilityMatrixSpreadsheet', filePath),
});
