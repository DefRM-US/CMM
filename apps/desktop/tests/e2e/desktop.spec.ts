import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  type ElectronApplication,
  _electron as electron,
  expect,
  type Page,
  test,
} from '@playwright/test';
import {
  buildCapabilityMatrixXlsxBuffer,
  parseCapabilityMatrixXlsxBuffer,
} from '../../../../packages/core/src/excel-buffer';

type AppSession = {
  electronApp: ElectronApplication;
  page: Page;
};

const tempDirs: string[] = [];

const sampleRequirements = [
  { text: 'Project overview', level: 0, score: 3 },
  { text: 'Target users', level: 1, score: 2 },
  { text: 'Success metrics', level: 1, score: 2 },
  { text: 'Core workflows', level: 0, score: 3 },
  { text: 'Onboarding', level: 1, score: 2 },
  { text: 'Account verification', level: 2, score: 1 },
  { text: 'Reporting', level: 1, score: 2 },
  { text: 'Risks & constraints', level: 0, score: 1 },
] as const;

const waitForAppReady = async (page: Page) => {
  await expect(page.getByText('Capability Matrix').first()).toBeVisible();
};

const registerTempDir = async (prefix: string) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

const computeNumbers = (levels: number[]) => {
  const counters: number[] = [];
  return levels.map((level) => {
    while (counters.length <= level) {
      counters.push(0);
    }
    counters[level] = (counters[level] ?? 0) + 1;
    counters.splice(level + 1);
    return counters.join('.');
  });
};

const buildSampleImportWorkbook = async (filePath: string) => {
  const numbers = computeNumbers(sampleRequirements.map((row) => row.level));
  const buffer = buildCapabilityMatrixXlsxBuffer({
    title: 'Vendor A Capability Matrix',
    legend: {
      3: 'Excellent capability',
      2: 'Good capability',
      1: 'Partial capability',
      0: 'No capability',
    },
    rows: sampleRequirements.map((row, index) => ({
      number: numbers[index] ?? `${index + 1}`,
      text: row.text,
      score: row.score,
      pastPerformance: `Evidence ${index + 1}`,
      comments: `Comment ${index + 1}`,
    })),
  });

  await writeFile(filePath, buffer);
};

const launchDesktopApp = async (
  dataDir: string,
  extraEnv: Record<string, string> = {},
): Promise<AppSession> => {
  const appDir = path.resolve(__dirname, '../..');
  const { ELECTRON_RUN_AS_NODE: _ignoredElectronRunAsNode, ...parentEnv } = process.env;
  const env = Object.fromEntries(
    Object.entries({
      ...parentEnv,
      CMM_DATA_DIR: dataDir,
      ...extraEnv,
    }).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );

  const electronApp = await electron.launch({
    args: [path.join(appDir, 'dist-electron/main.js')],
    cwd: appDir,
    env,
  });

  const page = await electronApp.firstWindow();
  await waitForAppReady(page);

  return { electronApp, page };
};

test.afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

test.describe
  .serial('desktop app flows', () => {
    test('creates a project, edits a requirement, and reloads persisted state', async () => {
      const dataDir = await registerTempDir('cmm-desktop-e2e-data-');

      const firstSession = await launchDesktopApp(dataDir);
      await expect(firstSession.page.getByText('Create your first project')).toBeVisible();

      await firstSession.page.getByRole('button', { name: 'New Project' }).click();
      await firstSession.page.getByPlaceholder('Project name').fill('Launch Checklist');
      await firstSession.page.getByRole('button', { name: 'Create' }).click();
      await firstSession.page.getByRole('button', { name: 'Add Row' }).click();
      await firstSession.page
        .locator('input[placeholder="Write a requirement..."]')
        .first()
        .fill('Collect customer goals');
      await expect(firstSession.page.getByText('Saved', { exact: true })).toBeVisible({
        timeout: 10_000,
      });
      await firstSession.electronApp.close();

      const secondSession = await launchDesktopApp(dataDir);
      await expect(
        secondSession.page.getByText('Launch Checklist', { exact: true }).first(),
      ).toBeVisible();
      await expect(
        secondSession.page.locator('input[value="Collect customer goals"]').first(),
      ).toBeVisible();
      await secondSession.electronApp.close();
    });

    test('persists a requirement edit when the app closes before autosave completes', async () => {
      const dataDir = await registerTempDir('cmm-desktop-e2e-quick-close-data-');

      const firstSession = await launchDesktopApp(dataDir);
      await expect(firstSession.page.getByText('Create your first project')).toBeVisible();

      await firstSession.page.getByRole('button', { name: 'New Project' }).click();
      await firstSession.page.getByPlaceholder('Project name').fill('Immediate Close Plan');
      await firstSession.page.getByRole('button', { name: 'Create' }).click();

      const firstRequirement = firstSession.page
        .locator('input[placeholder="Write a requirement..."]')
        .first();
      await firstRequirement.fill('Persist edits during close');
      await firstSession.electronApp.close();

      const secondSession = await launchDesktopApp(dataDir);
      await expect(
        secondSession.page.getByText('Immediate Close Plan', { exact: true }).first(),
      ).toBeVisible();
      await expect(
        secondSession.page.locator('input[value="Persist edits during close"]').first(),
      ).toBeVisible();
      await secondSession.electronApp.close();
    });

    test('exports a seeded capability matrix workbook', async () => {
      const dataDir = await registerTempDir('cmm-desktop-e2e-export-data-');
      const exportDir = await registerTempDir('cmm-desktop-e2e-export-file-');
      const exportPath = path.join(exportDir, 'sample-capability-matrix.xlsx');

      const { electronApp, page } = await launchDesktopApp(dataDir, {
        CMM_TEST_SAVE_PATH: exportPath,
      });

      await page.getByRole('button', { name: 'Load Sample Data' }).click();
      await expect(page.getByText('Sample - Just now', { exact: true }).first()).toBeVisible();
      await page.getByText('Sample - Just now', { exact: true }).first().click();
      await page.getByRole('button', { name: 'Export to Excel' }).click();
      await expect(page.getByText('Export settings')).toBeVisible();
      await page.getByRole('button', { name: 'Export', exact: true }).click();

      await expect(page.getByText(`Saved to ${exportPath}`)).toBeVisible({ timeout: 10_000 });
      await expect(access(exportPath)).resolves.toBeUndefined();

      const parsedWorkbook = await parseCapabilityMatrixXlsxBuffer(await readFile(exportPath));
      expect(parsedWorkbook.title).toBe('Sample - Just now - Capability Matrix');
      expect(parsedWorkbook.rows.length).toBeGreaterThan(0);

      await electronApp.close();
    });

    test('imports vendor responses and shows them in the comparison view', async () => {
      const dataDir = await registerTempDir('cmm-desktop-e2e-import-data-');
      const importDir = await registerTempDir('cmm-desktop-e2e-import-file-');
      const importPath = path.join(importDir, 'Vendor A.xlsx');

      await buildSampleImportWorkbook(importPath);

      const { electronApp, page } = await launchDesktopApp(dataDir, {
        CMM_TEST_OPEN_PATHS: importPath,
      });

      await page.getByRole('button', { name: 'Load Sample Data' }).click();
      await expect(page.getByText('Sample - Just now', { exact: true }).first()).toBeVisible();
      await page.getByText('Sample - Just now', { exact: true }).first().click();
      await page.getByRole('button', { name: 'Import Responses' }).click();

      await expect(page.getByText('Import responses', { exact: true })).toBeVisible();
      await expect(page.getByText('Vendor A.xlsx')).toBeVisible();
      await page.getByRole('button', { name: 'Import', exact: true }).click();

      await expect(page.getByText('Imported 1 response.')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Imported Responses', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Vendor A', { exact: true })).toBeVisible();

      await electronApp.close();
    });
  });
