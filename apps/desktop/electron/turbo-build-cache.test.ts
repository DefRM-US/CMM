// @vitest-environment node
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(__dirname, '../../..');

type TurboDryRunTask = {
  taskId: string;
  inputs: Record<string, string>;
  outputs: string[];
};

type TurboDryRun = {
  tasks: TurboDryRunTask[];
};

const readDesktopBuildDryRun = async () => {
  const { stdout } = await execFileAsync(
    'pnpm',
    ['turbo', 'run', 'build', '--filter=@app/desktop', '--dry=json'],
    {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024,
    },
  );
  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) {
    throw new Error(`Turbo dry run did not emit JSON: ${stdout}`);
  }

  return JSON.parse(stdout.slice(jsonStart)) as TurboDryRun;
};

describe('desktop Turbo build cache contract', () => {
  it('hashes desktop build inputs and preserves build outputs', async () => {
    const dryRun = await readDesktopBuildDryRun();
    const desktopBuild = dryRun.tasks.find((task) => task.taskId === '@app/desktop#build');

    expect(desktopBuild).toBeDefined();
    expect(Object.keys(desktopBuild?.inputs ?? {})).toEqual(
      expect.arrayContaining([
        'electron/main.ts',
        'electron/preload.ts',
        'electron/store.ts',
        'index.html',
        'vite.config.ts',
      ]),
    );
    expect(desktopBuild?.outputs).toEqual(
      expect.arrayContaining(['dist/**', 'dist-electron/**', 'build/**']),
    );
  });
});
