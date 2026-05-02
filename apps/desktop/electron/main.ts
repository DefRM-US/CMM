import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createOpportunityService } from '@cmm/application';
import { cmmWindowLifecycleChannels, validateWindowCloseResponse } from '@cmm/contracts';
import {
  type CmmSqliteDatabase,
  createCmmSqliteDatabase,
  createSqliteOpportunityRepository,
} from '@cmm/persistence-sqlite';
import { buildBaseCapabilityMatrixWorkbook } from '@cmm/workbook';
import { app, BrowserWindow, dialog, type IpcMainEvent, ipcMain } from 'electron';
import { createBaseCapabilityMatrixExportFileService } from './base-capability-matrix-export';
import { registerCmmIpcHandlers } from './cmm-ipc';

const rendererRoot = path.resolve(__dirname, '../dist');
const preloadPath = path.resolve(__dirname, 'preload.js');
const closeGuardTimeoutMs = 5000;

let database: CmmSqliteDatabase | null = null;
let allowAppQuit = false;
let quitAfterGuardedWindowClose = false;

const getDataDir = () => process.env.CMM_DATA_DIR ?? path.join(app.getPath('userData'), 'data');

const maybeQuitAfterGuardedWindowClose = () => {
  if (!quitAfterGuardedWindowClose || BrowserWindow.getAllWindows().length > 0) {
    return;
  }

  quitAfterGuardedWindowClose = false;
  allowAppQuit = true;
  app.quit();
};

const attachWindowCloseGuard = (window: BrowserWindow) => {
  let allowClose = false;

  window.on('close', (event) => {
    if (allowClose || window.webContents.isDestroyed()) {
      return;
    }

    event.preventDefault();

    const requestId = randomUUID();
    let timeout: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeout);
      ipcMain.off(cmmWindowLifecycleChannels.respondClose, handleCloseResponse);
    };

    const closeWindow = () => {
      if (window.isDestroyed()) {
        return;
      }

      allowClose = true;
      window.close();
    };

    const handleCloseResponse = (_event: IpcMainEvent, rawResponse: unknown) => {
      let response: ReturnType<typeof validateWindowCloseResponse>;
      try {
        response = validateWindowCloseResponse(rawResponse);
      } catch {
        return;
      }

      if (response.requestId !== requestId) {
        return;
      }

      cleanup();
      if (response.canClose) {
        closeWindow();
      } else {
        quitAfterGuardedWindowClose = false;
      }
    };

    timeout = setTimeout(() => {
      quitAfterGuardedWindowClose = false;
      cleanup();
    }, closeGuardTimeoutMs);

    ipcMain.on(cmmWindowLifecycleChannels.respondClose, handleCloseResponse);
    window.webContents.send(cmmWindowLifecycleChannels.requestClose, { requestId });
  });

  window.on('closed', maybeQuitAfterGuardedWindowClose);
};

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#f3f4f1',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  attachWindowCloseGuard(window);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: 'detach' });
    return;
  }
  await window.loadFile(path.join(rendererRoot, 'index.html'));
};

const registerHandlers = () => {
  const dataDir = getDataDir();
  mkdirSync(dataDir, { recursive: true });

  database = createCmmSqliteDatabase(path.join(dataDir, 'cmm.sqlite'));
  const opportunityService = createOpportunityService({
    repository: createSqliteOpportunityRepository(database),
    clock: {
      now: () => new Date().toISOString(),
    },
    ids: {
      next: () => randomUUID(),
    },
    workbookBuilder: {
      buildBaseCapabilityMatrixWorkbook,
    },
  });
  const baseCapabilityMatrixExportFileService = createBaseCapabilityMatrixExportFileService({
    opportunityService,
    showSaveDialog: (options) => dialog.showSaveDialog(options),
    writeFile,
  });

  registerCmmIpcHandlers(ipcMain, { opportunityService, baseCapabilityMatrixExportFileService });
};

app.whenReady().then(async () => {
  registerHandlers();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('before-quit', (event) => {
  if (allowAppQuit) {
    return;
  }

  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    allowAppQuit = true;
    return;
  }

  event.preventDefault();
  quitAfterGuardedWindowClose = true;
  for (const window of windows) {
    window.close();
  }
});

app.on('will-quit', () => {
  database?.close();
  database = null;
});

app.on('window-all-closed', () => {
  maybeQuitAfterGuardedWindowClose();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
