const { copyFileSync, mkdirSync, rmSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.dirname(require.resolve('better-sqlite3/package.json'));
const electronVersion = require('electron/package.json').version;
const platform = process.platform;
const arch = process.arch;
const bindingFilename = platform === 'win32' ? 'better_sqlite3.node' : 'better_sqlite3.node';

const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const readElectronModuleVersion = () => {
  const result = spawnSync(
    process.execPath,
    [require.resolve('electron/cli.js'), '-e', 'console.log(process.versions.modules)'],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
};

const copyCurrentBuild = (moduleVersion) => {
  const source = path.join(packageDir, 'build', 'Release', bindingFilename);
  const targetDir = path.join(
    packageDir,
    'lib',
    'binding',
    `node-v${moduleVersion}-${platform}-${arch}`,
  );
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(source, path.join(targetDir, bindingFilename));
};

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const nodeModuleVersion = process.versions.modules;
const electronModuleVersion = readElectronModuleVersion();

run(pnpm, ['--dir', packageDir, 'run', 'install']);
copyCurrentBuild(nodeModuleVersion);

run(pnpm, ['--dir', packageDir, 'run', 'install'], {
  npm_config_runtime: 'electron',
  npm_config_target: electronVersion,
  npm_config_disturl: 'https://electronjs.org/headers',
});
copyCurrentBuild(electronModuleVersion);

rmSync(path.join(packageDir, 'build'), { recursive: true, force: true });
