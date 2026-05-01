import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  type ElectronApplication,
  _electron as electron,
  expect,
  type Page,
  test,
} from '@playwright/test';

type AppSession = {
  electronApp: ElectronApplication;
  page: Page;
};

const tempDirs: string[] = [];

const waitForAppReady = async (page: Page) => {
  await expect(page.getByRole('heading', { name: 'Opportunities' })).toBeVisible();
};

const registerTempDir = async (prefix: string) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

const launchDesktopApp = async (dataDir: string): Promise<AppSession> => {
  const appDir = path.resolve(__dirname, '../..');
  const { ELECTRON_RUN_AS_NODE: _ignoredElectronRunAsNode, ...parentEnv } = process.env;
  const env = Object.fromEntries(
    Object.entries({
      ...parentEnv,
      CMM_DATA_DIR: dataDir,
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
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test.describe
  .serial('Opportunity tracer path', () => {
    test('creates and opens an Opportunity, then finds it after relaunch', async () => {
      const dataDir = await registerTempDir('cmm-desktop-opportunity-data-');

      const firstSession = await launchDesktopApp(dataDir);
      await expect(firstSession.page.getByText('No Opportunities yet')).toBeVisible();

      await firstSession.page.getByRole('button', { name: 'New Opportunity' }).click();
      await firstSession.page.getByLabel('Opportunity name').fill('Maritime Logistics Support');
      await firstSession.page.getByLabel('Solicitation Number').fill('MLS-26');
      await firstSession.page.getByLabel('Issuing Agency').fill('Defense Logistics Agency');
      await firstSession.page
        .getByLabel('Description')
        .fill('Local-first pursuit workspace for consortium planning.');
      await firstSession.page.getByRole('button', { name: 'Create Opportunity' }).click();

      await expect(
        firstSession.page.getByRole('heading', { name: 'Base Capability Matrix' }),
      ).toBeVisible();
      await expect(firstSession.page.getByText('No requirements yet.')).toBeVisible();
      await firstSession.page.getByRole('button', { name: 'Add Requirement' }).click();
      await firstSession.page.getByLabel('Requirement 1 text').fill('Provide secure hosting');
      await firstSession.page.getByRole('button', { name: 'Save Matrix' }).click();
      await expect(firstSession.page.getByText('Saved')).toBeVisible();
      await expect(
        firstSession.page.getByRole('button', { name: 'Open Maritime Logistics Support' }),
      ).toBeVisible();

      await firstSession.page.getByRole('button', { name: 'Archive Opportunity' }).click();
      await expect(firstSession.page.getByText('Read-only')).toBeVisible();
      await expect(
        firstSession.page.getByRole('button', { name: 'Restore Opportunity' }),
      ).toBeVisible();
      await firstSession.electronApp.close();

      const secondSession = await launchDesktopApp(dataDir);
      await expect(secondSession.page.getByText('No Opportunities yet')).toBeVisible();
      await secondSession.page.getByRole('button', { name: 'Archived' }).click();
      await expect(
        secondSession.page.getByRole('button', { name: 'Open Maritime Logistics Support' }),
      ).toBeVisible();
      await secondSession.page
        .getByRole('button', { name: 'Open Maritime Logistics Support' })
        .click();

      await expect(
        secondSession.page.getByRole('heading', { name: 'Base Capability Matrix' }),
      ).toBeVisible();
      await expect(secondSession.page.getByLabel('Requirement 1 text')).toHaveValue(
        'Provide secure hosting',
      );
      await expect(secondSession.page.getByLabel('Requirement 1 text')).toBeDisabled();
      await expect(secondSession.page.getByText('Read-only')).toBeVisible();

      await secondSession.page.getByRole('button', { name: 'Restore Opportunity' }).click();
      await expect(secondSession.page.getByRole('button', { name: 'Active' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(
        secondSession.page.getByRole('button', { name: 'Archive Opportunity' }),
      ).toBeVisible();

      await secondSession.page.getByRole('button', { name: 'Archive Opportunity' }).click();
      await expect(secondSession.page.getByText('Read-only')).toBeVisible();

      secondSession.page.once('dialog', (dialog) => {
        void dialog.accept();
      });
      await secondSession.page.getByRole('button', { name: 'Hard delete Opportunity' }).click();
      await expect(secondSession.page.getByText('No archived Opportunities')).toBeVisible();
      await secondSession.electronApp.close();

      const thirdSession = await launchDesktopApp(dataDir);
      await expect(thirdSession.page.getByText('No Opportunities yet')).toBeVisible();
      await thirdSession.page.getByRole('button', { name: 'Archived' }).click();
      await expect(thirdSession.page.getByText('No archived Opportunities')).toBeVisible();
      await thirdSession.electronApp.close();
    });
  });
