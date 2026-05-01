import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createOpportunityService } from '@cmm/application';
import {
  type CmmSqliteDatabase,
  createCmmSqliteDatabase,
  createSqliteOpportunityRepository,
} from '@cmm/persistence-sqlite';
import { app, BrowserWindow, ipcMain } from 'electron';
import { registerCmmIpcHandlers } from './cmm-ipc';

const rendererRoot = path.resolve(__dirname, '../dist');
const preloadPath = path.resolve(__dirname, 'preload.js');

let database: CmmSqliteDatabase | null = null;

const getDataDir = () => process.env.CMM_DATA_DIR ?? path.join(app.getPath('userData'), 'data');

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
  });

  registerCmmIpcHandlers(ipcMain, { opportunityService });
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

app.on('before-quit', () => {
  database?.close();
  database = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
