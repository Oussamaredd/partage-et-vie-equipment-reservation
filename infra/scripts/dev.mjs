#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WINDOWS = process.platform === 'win32';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PATHS = {
  composeFile: path.join(REPO_ROOT, 'infra', 'docker', 'docker-compose.yml'),
  apiDir: path.join(REPO_ROOT, 'api'),
  frontendDir: path.join(REPO_ROOT, 'frontend'),
  dbFile: path.join(REPO_ROOT, 'database', 'sqlite', 'data.db'),
  stateDir: path.join(REPO_ROOT, '.dev'),
  logsDir: path.join(REPO_ROOT, '.dev', 'logs'),
  stateFile: path.join(REPO_ROOT, '.dev', 'local-state.json'),
  apiLog: path.join(REPO_ROOT, '.dev', 'logs', 'api.log'),
  frontendLog: path.join(REPO_ROOT, '.dev', 'logs', 'frontend.log'),
};

const SERVICES = {
  api: {
    displayName: 'API',
    port: 8000,
    url: 'http://127.0.0.1:8000/api/equipment',
    logFile: PATHS.apiLog,
  },
  frontend: {
    displayName: 'Frontend',
    port: 5173,
    url: 'http://127.0.0.1:5173',
    logFile: PATHS.frontendLog,
  },
};

const TOOL_CANDIDATES = {
  docker: ['docker'],
  dockerCompose: ['docker-compose'],
  node: WINDOWS ? ['node.exe', 'node'] : ['node'],
  npm: WINDOWS ? ['npm.cmd', 'npm'] : ['npm'],
  php: WINDOWS ? ['php.exe', 'php'] : ['php'],
  composer: WINDOWS ? ['composer.bat', 'composer'] : ['composer'],
};

const HELP_TEXT = `
Usage:
  dev up
  dev down
  dev logs [api|frontend]
  dev status
  dev doctor
  dev reset --yes

  dev local up
  dev local down
  dev local logs [api|frontend|all] [--follow]
  dev local status
  dev local reset --yes

Notes:
  - Top-level commands target Docker mode by default.
  - Local mode manages background processes in .dev/local-state.json.
  - Local logs are written to .dev/logs/.
`;

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || isHelpFlag(args[0])) {
    printHelp();
    return;
  }

  const [command, ...rest] = args;

  if (command === 'local') {
    await handleLocalCommand(rest);
    return;
  }

  switch (command) {
    case 'up':
      await dockerUp();
      return;
    case 'down':
      await dockerDown();
      return;
    case 'logs':
      await dockerLogs(rest);
      return;
    case 'status':
      await fullStatus();
      return;
    case 'doctor':
      await doctor();
      return;
    case 'reset':
      await localReset(rest);
      return;
    default:
      throw new Error(`Unknown command: "${command}". Run "dev --help".`);
  }
}

async function handleLocalCommand(args) {
  const [command, ...rest] = args;

  if (!command || isHelpFlag(command)) {
    printHelp();
    return;
  }

  switch (command) {
    case 'up':
      await localUp();
      return;
    case 'down':
      await localDown();
      return;
    case 'logs':
      await localLogs(rest);
      return;
    case 'status':
      await localStatus();
      return;
    case 'doctor':
      await doctor();
      return;
    case 'reset':
      await localReset(rest);
      return;
    default:
      throw new Error(`Unknown local command: "${command}". Run "dev --help".`);
  }
}

function printHelp() {
  console.log(HELP_TEXT.trim());
}

function isHelpFlag(value) {
  return value === '-h' || value === '--help' || value === 'help';
}

async function dockerUp() {
  ensureFileExists(PATHS.composeFile, 'Docker compose file is missing');
  ensureComposeRunner();

  console.log('Starting Docker services...');
  runCompose(['up', '-d', '--build']);

  const apiReady = await waitForService('Docker API', SERVICES.api.url, 120_000);
  const frontendReady = await waitForService(
    'Docker frontend',
    SERVICES.frontend.url,
    120_000,
  );

  if (!apiReady || !frontendReady) {
    throw new Error(
      'Docker services started but health checks timed out. Run "dev logs" for details.',
    );
  }

  printSuccessEndpoints('Docker');
}

async function dockerDown() {
  ensureFileExists(PATHS.composeFile, 'Docker compose file is missing');
  ensureComposeRunner();

  console.log('Stopping Docker services...');
  runCompose(['down']);
  console.log('Docker services are stopped.');
}

async function dockerLogs(args) {
  ensureFileExists(PATHS.composeFile, 'Docker compose file is missing');
  ensureComposeRunner();

  const service = args[0];
  if (service && service !== 'api' && service !== 'frontend') {
    throw new Error(`Unknown Docker service "${service}". Use "api" or "frontend".`);
  }

  const composeArgs = ['logs', '-f'];
  if (service) {
    composeArgs.push(service);
  }

  runCompose(composeArgs);
}

async function fullStatus() {
  console.log('Docker status');
  console.log('-------------');
  try {
    const output = captureCompose(['ps']);
    console.log(output || '(no Docker services found)');
  } catch (error) {
    console.log(`Unavailable (${error.message})`);
  }

  console.log('');
  await localStatus();
}

async function localUp() {
  ensureStateDirectories();

  const state = readLocalState();
  if (state && (await localStackHealthy(state))) {
    console.log('Local services are already running.');
    printSuccessEndpoints('Local');
    return;
  }

  if (state) {
    console.log('Stale local state detected. Cleaning it up...');
    await localDown({ silent: true });
  }

  await assertLocalPortsAvailable();
  runLocalBootstrap();

  const nextState = {
    startedAt: new Date().toISOString(),
    services: {},
  };

  try {
    const phpCmd = requireCommand('php', TOOL_CANDIDATES.php);
    const apiPid = startDetachedProcess({
      command: phpCmd,
      args: ['-d', 'opcache.enable_cli=1', '-S', '127.0.0.1:8000', '-t', 'public'],
      cwd: PATHS.apiDir,
      logFile: SERVICES.api.logFile,
      label: 'api',
    });

    nextState.services.api = {
      pid: apiPid,
      logFile: toRepoRelative(SERVICES.api.logFile),
      url: SERVICES.api.url,
      port: SERVICES.api.port,
      startedAt: new Date().toISOString(),
    };
    writeLocalState(nextState);

    const apiReady = await waitForService('Local API', SERVICES.api.url, 120_000, {
      expectPid: apiPid,
    });
    if (!apiReady) {
      throw new Error(
        `Local API did not become ready. Check ${toRepoRelative(SERVICES.api.logFile)}.`,
      );
    }

    const npmCmd = requireCommand('npm', TOOL_CANDIDATES.npm);
    const frontendPid = startDetachedProcess({
      command: npmCmd,
      args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'],
      cwd: PATHS.frontendDir,
      logFile: SERVICES.frontend.logFile,
      label: 'frontend',
    });

    nextState.services.frontend = {
      pid: frontendPid,
      logFile: toRepoRelative(SERVICES.frontend.logFile),
      url: SERVICES.frontend.url,
      port: SERVICES.frontend.port,
      startedAt: new Date().toISOString(),
    };
    writeLocalState(nextState);

    const frontendReady = await waitForService(
      'Local frontend',
      SERVICES.frontend.url,
      120_000,
      {
        expectPid: frontendPid,
      },
    );
    if (!frontendReady) {
      throw new Error(
        `Local frontend did not become ready. Check ${toRepoRelative(SERVICES.frontend.logFile)}.`,
      );
    }

    printSuccessEndpoints('Local');
    console.log(`Logs: ${toRepoRelative(SERVICES.api.logFile)}, ${toRepoRelative(SERVICES.frontend.logFile)}`);
  } catch (error) {
    await localDown({ silent: true });
    throw error;
  }
}

async function localDown(options = {}) {
  const { silent = false } = options;
  const state = readLocalState();

  if (!state) {
    if (!silent) {
      console.log('No managed local services are running.');
    }
    return;
  }

  const servicesByStopOrder = ['frontend', 'api'];
  for (const serviceName of servicesByStopOrder) {
    const service = state.services?.[serviceName];
    if (!service?.pid) {
      continue;
    }

    if (!silent) {
      console.log(`Stopping ${serviceName} (pid ${service.pid})...`);
    }
    await killProcessTree(service.pid);
  }

  removeFileIfExists(PATHS.stateFile);

  if (!silent) {
    console.log('Local services are stopped.');
  }
}

async function localLogs(args) {
  ensureStateDirectories();

  const follow = args.includes('--follow');
  const filteredArgs = args.filter((arg) => arg !== '--follow');
  const target = filteredArgs[0] ?? 'all';

  if (!['api', 'frontend', 'all'].includes(target)) {
    throw new Error(`Unknown local log target "${target}". Use "api", "frontend", or "all".`);
  }

  if (follow && target === 'all') {
    throw new Error('Use one service with --follow. Example: "dev local logs api --follow".');
  }

  if (target === 'all') {
    printLogTail('api', SERVICES.api.logFile, 80);
    printLogTail('frontend', SERVICES.frontend.logFile, 80);
    return;
  }

  const service = SERVICES[target];
  printLogTail(target, service.logFile, 80);

  if (follow) {
    await followSingleLogFile(target, service.logFile);
  }
}

async function localStatus() {
  console.log('Local status');
  console.log('------------');

  const state = readLocalState();
  if (!state) {
    console.log('Managed local services: not running');
  } else {
    const serviceNames = ['api', 'frontend'];
    for (const serviceName of serviceNames) {
      const serviceState = state.services?.[serviceName];
      if (!serviceState) {
        console.log(`${serviceName}: not tracked`);
        continue;
      }

      const pidRunning = isPidRunning(serviceState.pid);
      const healthy = await isHttpHealthy(SERVICES[serviceName].url);
      const statusText = pidRunning && healthy ? 'running' : pidRunning ? 'degraded' : 'stopped';
      console.log(
        `${serviceName}: ${statusText} (pid=${serviceState.pid}, url=${SERVICES[serviceName].url}, log=${serviceState.logFile})`,
      );
    }
  }

  const apiPortBusy = await isPortInUse(SERVICES.api.port);
  const frontendPortBusy = await isPortInUse(SERVICES.frontend.port);
  console.log(`Port ${SERVICES.api.port}: ${apiPortBusy ? 'busy' : 'free'}`);
  console.log(`Port ${SERVICES.frontend.port}: ${frontendPortBusy ? 'busy' : 'free'}`);
}

async function localReset(args) {
  if (!args.includes('--yes')) {
    console.log('Refusing to reset without confirmation.');
    console.log('Run "dev reset --yes" or "dev local reset --yes".');
    return;
  }

  await localDown({ silent: true });

  const targets = [
    PATHS.dbFile,
    path.join(PATHS.apiDir, 'var', 'cache'),
    PATHS.stateDir,
  ];

  const removed = [];
  for (const target of targets) {
    if (!fs.existsSync(target)) {
      continue;
    }
    fs.rmSync(target, { recursive: true, force: true });
    removed.push(toRepoRelative(target));
  }

  if (removed.length === 0) {
    console.log('Nothing to reset.');
    return;
  }

  console.log('Removed local state:');
  for (const item of removed) {
    console.log(`- ${item}`);
  }
}

async function doctor() {
  console.log('Environment doctor');
  console.log('------------------');

  const checks = [
    {
      label: 'docker',
      candidates: TOOL_CANDIDATES.docker,
      versionArgs: ['--version'],
    },
    {
      label: 'php',
      candidates: TOOL_CANDIDATES.php,
      versionArgs: ['--version'],
    },
    {
      label: 'composer',
      candidates: TOOL_CANDIDATES.composer,
      versionArgs: ['--version'],
    },
    {
      label: 'node',
      candidates: TOOL_CANDIDATES.node,
      versionArgs: ['--version'],
    },
    {
      label: 'npm',
      candidates: TOOL_CANDIDATES.npm,
      versionArgs: ['--version'],
    },
  ];

  for (const check of checks) {
    const command = findCommand(check.candidates);
    if (!command) {
      console.log(`[MISSING] ${check.label}`);
      continue;
    }

    const output = captureCommand(command, check.versionArgs);
    const canRunVersion = commandWorks(command, check.versionArgs);
    if (!canRunVersion) {
      console.log(
        `[WARN] ${check.label}: found "${command}" but failed to execute ${check.versionArgs.join(' ')}`,
      );
      continue;
    }

    const versionLine = firstLine(output) ?? 'available';
    console.log(`[OK] ${check.label}: ${versionLine}`);
  }

  const composeRunner = resolveComposeRunner();
  if (!composeRunner) {
    console.log('[MISSING] docker compose plugin (or docker-compose)');
  } else {
    console.log(`[OK] docker compose: ${formatCommand(composeRunner.command, composeRunner.prefix)}`);
  }

  const apiPortBusy = await isPortInUse(SERVICES.api.port);
  const frontendPortBusy = await isPortInUse(SERVICES.frontend.port);
  console.log(`Port ${SERVICES.api.port}: ${apiPortBusy ? 'busy' : 'free'}`);
  console.log(`Port ${SERVICES.frontend.port}: ${frontendPortBusy ? 'busy' : 'free'}`);

  ensureStateDirectories();
  console.log(`[OK] writable state dir: ${toRepoRelative(PATHS.stateDir)}`);
}

function runLocalBootstrap() {
  const phpCmd = requireCommand('php', TOOL_CANDIDATES.php);
  const composerCmd = requireCommand('composer', TOOL_CANDIDATES.composer);
  const npmCmd = requireCommand('npm', TOOL_CANDIDATES.npm);

  const apiAutoload = path.join(PATHS.apiDir, 'vendor', 'autoload.php');
  if (!fs.existsSync(apiAutoload)) {
    console.log('Installing API dependencies (composer install)...');
    runCommand(composerCmd, ['install', '--no-interaction', '--prefer-dist'], {
      cwd: PATHS.apiDir,
    });
  }

  const frontendNodeModules = path.join(PATHS.frontendDir, 'node_modules');
  if (!fs.existsSync(frontendNodeModules)) {
    console.log('Installing frontend dependencies (npm install)...');
    runCommand(npmCmd, ['install'], {
      cwd: PATHS.frontendDir,
    });
  }

  fs.mkdirSync(path.dirname(PATHS.dbFile), { recursive: true });

  if (!fs.existsSync(PATHS.dbFile)) {
    console.log('Creating local database and fixtures...');
    runCommand(
      phpCmd,
      ['bin/console', 'doctrine:migrations:migrate', '--no-interaction'],
      { cwd: PATHS.apiDir },
    );
    runCommand(
      phpCmd,
      ['bin/console', 'doctrine:fixtures:load', '--no-interaction'],
      { cwd: PATHS.apiDir },
    );
    return;
  }

  console.log('Applying pending migrations...');
  runCommand(
    phpCmd,
    ['bin/console', 'doctrine:migrations:migrate', '--no-interaction'],
    { cwd: PATHS.apiDir },
  );
}

async function assertLocalPortsAvailable() {
  for (const [serviceName, service] of Object.entries(SERVICES)) {
    const inUse = await isPortInUse(service.port);
    if (!inUse) {
      continue;
    }
    throw new Error(
      `Port ${service.port} is already in use (${serviceName}). Free it first or run "dev local down" if it is a stale local process.`,
    );
  }
}

function ensureComposeRunner() {
  const composeRunner = resolveComposeRunner();
  if (!composeRunner) {
    throw new Error(
      'Docker Compose is required. Install Docker Desktop (with compose plugin) or docker-compose.',
    );
  }

  return composeRunner;
}

function runCompose(composeArgs) {
  const composeRunner = ensureComposeRunner();
  const args = [...composeRunner.prefix, '-f', PATHS.composeFile, ...composeArgs];
  runCommand(composeRunner.command, args, { cwd: REPO_ROOT });
}

function captureCompose(composeArgs) {
  const composeRunner = ensureComposeRunner();
  const args = [...composeRunner.prefix, '-f', PATHS.composeFile, ...composeArgs];
  const prepared = prepareSpawn(composeRunner.command, args);
  const result = spawnSync(prepared.command, prepared.args, {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw new Error(`Failed to run ${formatCommand(composeRunner.command, args)}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const details = firstLine(`${result.stdout ?? ''}\n${result.stderr ?? ''}`) ?? 'exit code not zero';
    throw new Error(`${details}`);
  }

  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function resolveComposeRunner() {
  const docker = findCommand(TOOL_CANDIDATES.docker);
  if (docker && commandWorks(docker, ['compose', 'version'])) {
    return { command: docker, prefix: ['compose'] };
  }

  const dockerCompose = findCommand(TOOL_CANDIDATES.dockerCompose);
  if (dockerCompose && commandWorks(dockerCompose, ['--version'])) {
    return { command: dockerCompose, prefix: [] };
  }

  return null;
}

function ensureStateDirectories() {
  fs.mkdirSync(PATHS.stateDir, { recursive: true });
  fs.mkdirSync(PATHS.logsDir, { recursive: true });
}

function readLocalState() {
  if (!fs.existsSync(PATHS.stateFile)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(PATHS.stateFile, 'utf8'));
  } catch (_error) {
    return null;
  }
}

function writeLocalState(state) {
  ensureStateDirectories();
  fs.writeFileSync(PATHS.stateFile, `${JSON.stringify(state, null, 2)}${os.EOL}`, 'utf8');
}

function removeFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

async function localStackHealthy(state) {
  const apiPid = state?.services?.api?.pid;
  const frontendPid = state?.services?.frontend?.pid;

  if (!apiPid || !frontendPid) {
    return false;
  }
  if (!isPidRunning(apiPid) || !isPidRunning(frontendPid)) {
    return false;
  }

  const [apiHealthy, frontendHealthy] = await Promise.all([
    isHttpHealthy(SERVICES.api.url),
    isHttpHealthy(SERVICES.frontend.url),
  ]);
  return apiHealthy && frontendHealthy;
}

function isPidRunning(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (_error) {
    return false;
  }
}

async function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (WINDOWS) {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch (_error) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (_ignored) {
      return;
    }
  }

  await sleep(500);

  if (!isPidRunning(pid)) {
    return;
  }

  try {
    process.kill(-pid, 'SIGKILL');
  } catch (_error) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch (_ignored) {
      // no-op
    }
  }
}

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function waitForService(name, url, timeoutMs, options = {}) {
  const { expectPid = null } = options;
  const startTime = Date.now();
  process.stdout.write(`Waiting for ${name} (${url})`);

  while (Date.now() - startTime <= timeoutMs) {
    if (expectPid && !isPidRunning(expectPid)) {
      process.stdout.write(` failed (process ${expectPid} exited)${os.EOL}`);
      return false;
    }

    if (await isHttpHealthy(url)) {
      process.stdout.write(` ready${os.EOL}`);
      return true;
    }
    process.stdout.write('.');
    await sleep(1_500);
  }

  process.stdout.write(` timeout${os.EOL}`);
  return false;
}

async function isHttpHealthy(url) {
  const timeoutMs = 3_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    return response.status >= 200 && response.status < 500;
  } catch (_error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startDetachedProcess({ command, args, cwd, logFile, label }) {
  ensureStateDirectories();
  appendLog(
    logFile,
    `[${new Date().toISOString()}] starting ${label}: ${formatCommand(command, args)}`,
  );

  const prepared = prepareSpawn(command, args);
  const logFd = fs.openSync(logFile, 'a');

  const child = spawn(prepared.command, prepared.args, {
    cwd,
    env: process.env,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', logFd, logFd],
  });

  child.unref();
  fs.closeSync(logFd);
  return child.pid;
}

function printLogTail(name, filePath, lines) {
  const label = `${name.toUpperCase()} LOG`;
  console.log('');
  console.log(`${label} (${toRepoRelative(filePath)})`);
  console.log('-'.repeat(label.length + toRepoRelative(filePath).length + 3));

  if (!fs.existsSync(filePath)) {
    console.log('(no log file yet)');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const contentLines = content.split(/\r?\n/).filter((line) => line.length > 0);
  const tailLines = contentLines.slice(-lines);

  if (tailLines.length === 0) {
    console.log('(empty)');
    return;
  }

  for (const line of tailLines) {
    console.log(line);
  }
}

async function followSingleLogFile(name, filePath) {
  console.log('');
  console.log(`Following ${name} logs from ${toRepoRelative(filePath)} (Ctrl+C to stop)`);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }

  let position = fs.statSync(filePath).size;

  await new Promise((resolve) => {
    const onSigint = () => {
      clearInterval(interval);
      process.removeListener('SIGINT', onSigint);
      resolve();
    };

    const interval = setInterval(() => {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const size = fs.statSync(filePath).size;
      if (size < position) {
        position = 0;
      }
      if (size === position) {
        return;
      }

      const fd = fs.openSync(filePath, 'r');
      const chunkSize = size - position;
      const buffer = Buffer.alloc(chunkSize);
      fs.readSync(fd, buffer, 0, chunkSize, position);
      fs.closeSync(fd);

      position = size;
      const text = buffer.toString('utf8');
      process.stdout.write(text);
    }, 1_000);

    process.on('SIGINT', onSigint);
  });
}

function appendLog(filePath, line) {
  ensureStateDirectories();
  fs.appendFileSync(filePath, `${line}${os.EOL}`, 'utf8');
}

function runCommand(command, args, options = {}) {
  const { cwd = REPO_ROOT, env = process.env, stdio = 'inherit' } = options;
  const prepared = prepareSpawn(command, args);
  const result = spawnSync(prepared.command, prepared.args, { cwd, env, stdio });

  if (result.error) {
    throw new Error(`Failed to run "${formatCommand(command, args)}": ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${formatCommand(command, args)}`);
  }

  return result;
}

function captureCommand(command, args) {
  const prepared = prepareSpawn(command, args);
  const result = spawnSync(prepared.command, prepared.args, {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return output.length > 0 ? output : null;
}

function commandWorks(command, args) {
  const prepared = prepareSpawn(command, args);
  const result = spawnSync(prepared.command, prepared.args, {
    cwd: REPO_ROOT,
    env: process.env,
    stdio: 'ignore',
  });
  return !result.error && result.status === 0;
}

function findCommand(candidates) {
  for (const candidate of candidates) {
    if (commandExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function commandExists(command) {
  const checker = WINDOWS ? 'where' : 'which';
  const result = spawnSync(checker, [command], { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function requireCommand(label, candidates) {
  const command = findCommand(candidates);
  if (!command) {
    throw new Error(`Missing required command "${label}". Run "dev doctor".`);
  }
  return command;
}

function prepareSpawn(command, args) {
  if (!WINDOWS) {
    return { command, args };
  }

  const normalized = command.toLowerCase();
  if (!normalized.endsWith('.cmd') && !normalized.endsWith('.bat')) {
    return { command, args };
  }

  const commandLine = [quoteForCmd(command), ...args.map((arg) => quoteForCmd(String(arg)))].join(' ');
  return {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', commandLine],
  };
}

function quoteForCmd(value) {
  if (value.length === 0) {
    return '""';
  }
  if (!/[ \t"&()<>^|]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function ensureFileExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${message}: ${toRepoRelative(filePath)}`);
  }
}

function toRepoRelative(filePath) {
  return path.relative(REPO_ROOT, filePath).replaceAll('\\', '/');
}

function printSuccessEndpoints(modeLabel) {
  console.log(`${modeLabel} services are ready:`);
  console.log(`- API: ${SERVICES.api.url.replace('/api/equipment', '')}`);
  console.log(`- Frontend: ${SERVICES.frontend.url}`);
}

function formatCommand(command, args) {
  return [command, ...args].join(' ');
}

function firstLine(value) {
  if (!value) {
    return null;
  }
  const line = value.split(/\r?\n/).map((part) => part.trim()).find((part) => part.length > 0);
  return line ?? null;
}
