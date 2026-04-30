import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { createDesktopStore } from './store';

const rendererRoot = path.resolve(__dirname, '../dist');
const preloadPath = path.resolve(__dirname, 'preload.js');
const CLOSE_FLUSH_TIMEOUT_MS = 5000;

const getDataDir = () => process.env.CMM_DATA_DIR ?? path.join(app.getPath('userData'), 'data');
const store = createDesktopStore(getDataDir());
const pendingCloseFlushes = new Map<
  string,
  { senderId: number; resolve: () => void; timeout: ReturnType<typeof setTimeout> }
>();

let closeFlushId = 0;
let quitAfterCloseFlush = false;
let quitFlushInProgress = false;

const requestRendererCloseFlush = (window: BrowserWindow): Promise<void> => {
  if (window.isDestroyed() || window.webContents.isDestroyed()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    closeFlushId += 1;
    const requestId = `close-flush-${Date.now().toString(36)}-${closeFlushId.toString(36)}`;
    const timeout = setTimeout(() => {
      pendingCloseFlushes.delete(requestId);
      resolve();
    }, CLOSE_FLUSH_TIMEOUT_MS);

    pendingCloseFlushes.set(requestId, {
      senderId: window.webContents.id,
      resolve,
      timeout,
    });
    window.webContents.send('desktop:flushPendingSavesForClose', requestId);
  });
};

const resolveCloseFlush = (requestId: string, senderId: number) => {
  const pending = pendingCloseFlushes.get(requestId);
  if (!pending || pending.senderId !== senderId) {
    return;
  }

  clearTimeout(pending.timeout);
  pendingCloseFlushes.delete(requestId);
  pending.resolve();
};

const flushOpenWindowsBeforeQuit = async () => {
  const windows = BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed());
  await Promise.all(windows.map((window) => requestRendererCloseFlush(window)));
  windows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  });
};

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0f1721',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  let closeAfterFlush = false;
  let closeFlushInProgress = false;

  window.on('close', (event) => {
    if (closeAfterFlush) return;
    event.preventDefault();
    if (closeFlushInProgress) return;

    closeFlushInProgress = true;
    void requestRendererCloseFlush(window).finally(() => {
      closeAfterFlush = true;
      if (!window.isDestroyed()) {
        window.destroy();
      }
    });
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: 'detach' });
    return;
  }
  await window.loadFile(path.join(rendererRoot, 'index.html'));
};

const registerHandlers = () => {
  ipcMain.handle('desktop:initDatabase', () => store.initDatabase());
  ipcMain.handle('desktop:listProjects', () => store.listProjects());
  ipcMain.handle('desktop:createProject', (_event, name: string) => store.createProject(name));
  ipcMain.handle('desktop:deleteProjects', (_event, projectIds: string[]) =>
    store.deleteProjects(projectIds),
  );
  ipcMain.handle('desktop:seedSampleProjects', (_event, size: 'compact' | 'medium' | 'large') =>
    store.seedSampleProjects(size),
  );
  ipcMain.handle('desktop:touchProject', (_event, projectId: string) =>
    store.touchProject(projectId),
  );
  ipcMain.handle('desktop:loadProjectRequirements', (_event, projectId: string) =>
    store.loadProjectRequirements(projectId),
  );
  ipcMain.handle(
    'desktop:saveProjectRequirements',
    (_event, projectId: string, rows: Parameters<typeof store.saveProjectRequirements>[1]) =>
      store.saveProjectRequirements(projectId, rows),
  );
  ipcMain.handle(
    'desktop:listCapabilityImports',
    (_event, projectId: string, includeArchived: boolean) =>
      store.listCapabilityImports(projectId, includeArchived),
  );
  ipcMain.handle('desktop:listCapabilityImportRows', (_event, importId: string) =>
    store.listCapabilityImportRows(importId),
  );
  ipcMain.handle('desktop:saveCapabilityImportWithRows', (_event, input) =>
    store.saveCapabilityImportWithRows(input),
  );
  ipcMain.on('desktop:closeFlushComplete', (event, requestId: string) => {
    resolveCloseFlush(requestId, event.sender.id);
  });
  ipcMain.handle('desktop:showSaveDialog', async (_event, defaultFileName: string) => {
    if (process.env.CMM_TEST_SAVE_PATH) {
      return process.env.CMM_TEST_SAVE_PATH;
    }
    const result = await dialog.showSaveDialog({
      defaultPath: defaultFileName,
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    });
    return result.canceled ? null : result.filePath;
  });
  ipcMain.handle('desktop:showOpenDialog', async () => {
    if (process.env.CMM_TEST_OPEN_PATHS) {
      return process.env.CMM_TEST_OPEN_PATHS.split(path.delimiter).filter(Boolean);
    }
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
    });
    return result.canceled ? null : result.filePaths;
  });
  ipcMain.handle('desktop:generateCapabilityMatrixSpreadsheet', (_event, options) =>
    store.generateCapabilityMatrixSpreadsheet(options),
  );
  ipcMain.handle('desktop:parseCapabilityMatrixSpreadsheet', (_event, filePath: string) =>
    store.parseCapabilityMatrixSpreadsheet(filePath),
  );
};

app.whenReady().then(async () => {
  await store.initDatabase();
  registerHandlers();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('before-quit', (event) => {
  if (quitAfterCloseFlush) return;
  const windows = BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed());
  if (windows.length === 0) return;

  event.preventDefault();
  if (quitFlushInProgress) return;
  quitFlushInProgress = true;

  void flushOpenWindowsBeforeQuit().finally(() => {
    quitAfterCloseFlush = true;
    app.exit(0);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
