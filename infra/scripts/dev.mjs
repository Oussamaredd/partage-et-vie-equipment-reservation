#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WINDOWS = process.platform === 'win32';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PATHS = {
  composeFile: path.join(REPO_ROOT, 'docker-compose.yml'),
  apiDir: path.join(REPO_ROOT, 'api'),
  frontendDir: path.join(REPO_ROOT, 'frontend'),
  dbFile: path.join(REPO_ROOT, 'database', 'sqlite', 'data.db'),
  stateDir: path.join(REPO_ROOT, '.dev'),
  logsDir: path.join(REPO_ROOT, '.dev', 'logs'),
  stateFile: path.join(REPO_ROOT, '.dev', 'local-state.json'),
  bootstrapStateFile: path.join(REPO_ROOT, '.dev', 'bootstrap-state.json'),
  apiLog: path.join(REPO_ROOT, '.dev', 'logs', 'api.log'),
  frontendLog: path.join(REPO_ROOT, '.dev', 'logs', 'frontend.log'),
};

const SERVICES = {
  api: {
    displayName: 'API',
    defaultPort: 8000,
    healthPath: '/api/equipment',
    logFile: PATHS.apiLog,
  },
  frontend: {
    displayName: 'Frontend',
    defaultPort: 5173,
    healthPath: '',
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
  dev reset [local|docker|all] --yes

  dev local up [--foreground]
  dev local down [--orphans]
  dev local logs [api|frontend|all] [--follow]
  dev local status
  dev local reset --yes

Notes:
  - Top-level commands target Docker mode by default.
  - Reset defaults to local scope unless "docker" or "all" is specified.
  - Local mode manages background processes in .dev/local-state.json.
  - If 8000/5173 are busy, local mode picks the next free ports automatically.
  - Use "--foreground" to keep local services attached to the current terminal.
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
      await resetCommand(rest, { defaultScope: 'local', allowScopeOverride: true });
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
      await localUp(rest);
      return;
    case 'down':
      await localDown({ args: rest });
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
      await resetCommand(rest, { defaultScope: 'local', allowScopeOverride: false });
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

  const apiReady = await waitForService(
    'Docker API',
    buildServiceHealthUrl('api', SERVICES.api.defaultPort),
    120_000,
  );
  const frontendReady = await waitForService(
    'Docker frontend',
    buildServiceHealthUrl('frontend', SERVICES.frontend.defaultPort),
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

async function localUp(args = []) {
  const foreground = args.includes('--foreground');
  const unknownArgs = args.filter((arg) => arg !== '--foreground');
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown local up option(s): ${unknownArgs.join(', ')}. Use "dev local up --foreground".`);
  }

  ensureStateDirectories();

  const state = readLocalState();
  if (state && (await localStackHealthy(state))) {
    console.log('Local services are already running.');
    printSuccessEndpoints('Local', getServicePortsFromState(state));
    if (foreground) {
      console.log('Foreground mode requires a fresh start. Run "dev local down" first.');
    }
    return;
  }

  if (state) {
    console.log('Stale local state detected. Cleaning it up...');
    await localDown({ silent: true });
  }

  const localPorts = await resolveLocalPorts();
  runLocalBootstrap();

  if (foreground) {
    await localUpForeground(localPorts);
    return;
  }

  await localUpDetached(localPorts);
}

async function localUpDetached(localPorts) {
  const nextState = {
    startedAt: new Date().toISOString(),
    mode: 'detached',
    services: {},
  };

  try {
    const phpCmd = requireCommand('php', TOOL_CANDIDATES.php);
    const apiPid = startDetachedProcess({
      command: phpCmd,
      args: ['-d', 'opcache.enable_cli=1', '-S', `127.0.0.1:${localPorts.api}`, '-t', 'public'],
      cwd: PATHS.apiDir,
      logFile: SERVICES.api.logFile,
      label: 'api',
    });

    nextState.services.api = buildServiceState('api', apiPid, localPorts.api);
    writeLocalState(nextState);

    const apiReady = await waitForService('Local API', buildServiceHealthUrl('api', localPorts.api), 120_000, {
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
      args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(localPorts.frontend)],
      cwd: PATHS.frontendDir,
      logFile: SERVICES.frontend.logFile,
      label: 'frontend',
      extraEnv: {
        VITE_API_PROXY_TARGET: buildServiceBaseUrl(localPorts.api),
      },
    });

    nextState.services.frontend = buildServiceState('frontend', frontendPid, localPorts.frontend);
    writeLocalState(nextState);

    const frontendReady = await waitForService(
      'Local frontend',
      buildServiceHealthUrl('frontend', localPorts.frontend),
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

    printSuccessEndpoints('Local', localPorts);
    console.log(`Logs: ${toRepoRelative(SERVICES.api.logFile)}, ${toRepoRelative(SERVICES.frontend.logFile)}`);
  } catch (error) {
    await localDown({ silent: true });
    throw error;
  }
}

async function localUpForeground(localPorts) {
  const nextState = {
    startedAt: new Date().toISOString(),
    mode: 'foreground',
    services: {},
  };

  let apiChild = null;
  let frontendChild = null;

  try {
    const phpCmd = requireCommand('php', TOOL_CANDIDATES.php);
    apiChild = startAttachedProcess({
      command: phpCmd,
      args: ['-d', 'opcache.enable_cli=1', '-S', `127.0.0.1:${localPorts.api}`, '-t', 'public'],
      cwd: PATHS.apiDir,
      label: 'api',
    });
    nextState.services.api = buildServiceState('api', apiChild.pid, localPorts.api);
    writeLocalState(nextState);

    const apiReady = await waitForService('Local API', buildServiceHealthUrl('api', localPorts.api), 120_000, {
      expectPid: apiChild.pid,
    });
    if (!apiReady) {
      throw new Error('Local API did not become ready in foreground mode.');
    }

    const npmCmd = requireCommand('npm', TOOL_CANDIDATES.npm);
    frontendChild = startAttachedProcess({
      command: npmCmd,
      args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(localPorts.frontend)],
      cwd: PATHS.frontendDir,
      label: 'frontend',
      extraEnv: {
        VITE_API_PROXY_TARGET: buildServiceBaseUrl(localPorts.api),
      },
    });
    nextState.services.frontend = buildServiceState('frontend', frontendChild.pid, localPorts.frontend);
    writeLocalState(nextState);

    const frontendReady = await waitForService('Local frontend', buildServiceHealthUrl('frontend', localPorts.frontend), 120_000, {
      expectPid: frontendChild.pid,
    });
    if (!frontendReady) {
      throw new Error('Local frontend did not become ready in foreground mode.');
    }

    printSuccessEndpoints('Local', localPorts);
    console.log('Foreground mode active. Press Ctrl+C to stop API + frontend.');

    await waitForForegroundShutdown([
      { name: 'frontend', child: frontendChild },
      { name: 'api', child: apiChild },
    ]);
  } catch (error) {
    await stopChildProcesses([frontendChild, apiChild]);
    removeFileIfExists(PATHS.stateFile);
    throw error;
  }
}

function buildServiceState(serviceName, pid, port) {
  const service = SERVICES[serviceName];
  return {
    pid,
    logFile: toRepoRelative(service.logFile),
    url: buildServiceHealthUrl(serviceName, port),
    port,
    startedAt: new Date().toISOString(),
  };
}

async function localDown(options = {}) {
  const { silent = false, args = [] } = options;
  const orphanCleanup = args.includes('--orphans');
  const unknownArgs = args.filter((arg) => arg !== '--orphans');
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown local down option(s): ${unknownArgs.join(', ')}. Use "dev local down --orphans".`);
  }

  const state = readLocalState();

  if (!state) {
    if (orphanCleanup) {
      const orphanStopped = await stopOrphanLocalProcesses({ silent });
      if (!silent) {
        if (orphanStopped > 0) {
          console.log(`Stopped ${orphanStopped} orphan local service process(es).`);
        } else {
          console.log('No managed local services are running and no local orphan process was found.');
        }
      }
      return;
    }

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
    const stopped = await killProcessTree(service.pid);
    if (!stopped && !silent) {
      console.log(`Warning: could not stop ${serviceName} (pid ${service.pid}). Check permissions and close it manually.`);
    }
  }

  removeFileIfExists(PATHS.stateFile);

  let orphanStopped = 0;
  if (orphanCleanup) {
    orphanStopped = await stopOrphanLocalProcesses({ silent });
  }

  if (!silent) {
    console.log('Local services are stopped.');
    if (orphanStopped > 0) {
      console.log(`Also stopped ${orphanStopped} orphan process(es).`);
    }
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
  const serviceNames = ['api', 'frontend'];
  if (!state) {
    console.log('Managed local services: not running');
  } else {
    for (const serviceName of serviceNames) {
      const serviceState = state.services?.[serviceName];
      if (!serviceState) {
        console.log(`${serviceName}: not tracked`);
        continue;
      }

      const servicePort = serviceState.port ?? SERVICES[serviceName].defaultPort;
      const healthUrl = serviceState.url ?? buildServiceHealthUrl(serviceName, servicePort);
      const pidRunning = isPidRunning(serviceState.pid);
      const healthy = await isHttpHealthy(healthUrl);
      const statusText = pidRunning && healthy ? 'running' : pidRunning ? 'degraded' : 'stopped';
      console.log(
        `${serviceName}: ${statusText} (pid=${serviceState.pid}, url=${healthUrl}, log=${serviceState.logFile})`,
      );
    }
  }

  for (const serviceName of serviceNames) {
    const servicePort = getServicePort(serviceName, state);
    const portBusy = await isPortInUse(servicePort);
    console.log(`Port ${servicePort}: ${portBusy ? 'busy' : 'free'} (${serviceName})`);
  }
}

async function resetCommand(args, options = {}) {
  const { defaultScope = 'local', allowScopeOverride = true } = options;
  const { scope, confirmed } = parseResetArgs(args, { defaultScope, allowScopeOverride });

  if (!confirmed) {
    console.log('Refusing to reset without confirmation.');
    if (allowScopeOverride) {
      console.log('Run one of the following commands:');
      console.log('- dev reset local --yes');
      console.log('- dev reset docker --yes');
      console.log('- dev reset all --yes');
      return;
    }
    console.log('Run "dev local reset --yes".');
    return;
  }

  if (scope === 'docker') {
    await resetDockerScope();
    return;
  }

  if (scope === 'all') {
    await resetAllScopes();
    return;
  }

  await resetLocalScope();
}

function parseResetArgs(args, options = {}) {
  const { defaultScope = 'local', allowScopeOverride = true } = options;
  let scope = defaultScope;
  let confirmed = false;
  const validScopes = ['local', 'docker', 'all'];
  const unknownArgs = [];

  for (const arg of args) {
    if (arg === '--yes') {
      confirmed = true;
      continue;
    }

    if (validScopes.includes(arg)) {
      if (!allowScopeOverride && arg !== defaultScope) {
        throw new Error(`Scope "${arg}" is not supported for this command. Use "${defaultScope}".`);
      }
      scope = arg;
      continue;
    }

    unknownArgs.push(arg);
  }

  if (unknownArgs.length > 0) {
    throw new Error(`Unknown reset option(s): ${unknownArgs.join(', ')}`);
  }

  return { scope, confirmed };
}

async function resetLocalScope() {
  await localDown({ silent: true });
  const removed = removeLocalArtifacts();
  printResetSummary('Local', removed);
}

async function resetDockerScope() {
  await dockerDown();
  console.log('Docker reset completed.');
}

async function resetAllScopes() {
  let dockerError = null;
  try {
    await dockerDown();
  } catch (error) {
    dockerError = error;
  }

  await localDown({ silent: true });
  const removed = removeLocalArtifacts();
  printResetSummary('Local', removed);

  if (dockerError) {
    throw new Error(`Docker reset failed while local reset succeeded: ${dockerError.message}`);
  }

  console.log('Docker reset completed.');
}

function removeLocalArtifacts() {
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
  return removed;
}

function printResetSummary(scopeLabel, removedPaths) {
  if (removedPaths.length === 0) {
    console.log(`Nothing to reset for ${scopeLabel.toLowerCase()} scope.`);
    return;
  }

  console.log(`Removed ${scopeLabel.toLowerCase()} state:`);
  for (const item of removedPaths) {
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
    const resolved = resolveCommandDetails(check.candidates);
    if (!resolved) {
      console.log(`[MISSING] ${check.label}`);
      continue;
    }

    const output = captureCommand(resolved.command, check.versionArgs);
    const canRunVersion = commandWorks(resolved.command, check.versionArgs);
    if (!canRunVersion) {
      console.log(
        `[WARN] ${check.label}: found "${resolved.command}" (${resolved.path}) but failed to execute ${check.versionArgs.join(' ')}`,
      );
      continue;
    }

    const versionLine = firstLine(output) ?? 'available';
    console.log(`[OK] ${check.label}: ${versionLine} (${resolved.path})`);
  }

  const composeRunner = resolveComposeRunner();
  if (!composeRunner) {
    console.log('[MISSING] docker compose plugin (or docker-compose)');
  } else {
    const composePath = resolveCommandPath(composeRunner.command) ?? composeRunner.command;
    console.log(`[OK] docker compose: ${formatCommand(composeRunner.command, composeRunner.prefix)} (${composePath})`);
  }

  const apiPortBusy = await isPortInUse(SERVICES.api.defaultPort);
  const frontendPortBusy = await isPortInUse(SERVICES.frontend.defaultPort);
  console.log(`Port ${SERVICES.api.defaultPort}: ${apiPortBusy ? 'busy' : 'free'}`);
  console.log(`Port ${SERVICES.frontend.defaultPort}: ${frontendPortBusy ? 'busy' : 'free'}`);

  ensureStateDirectories();
  console.log(`[OK] writable state dir: ${toRepoRelative(PATHS.stateDir)}`);
  console.log(`[INFO] shell: ${process.env.SHELL ?? process.env.ComSpec ?? 'unknown'}`);
  console.log(`[INFO] terminal: ${process.env.TERM_PROGRAM ?? process.env.WT_SESSION ?? 'unknown'}`);
}

function runLocalBootstrap() {
  const phpCmd = requireCommand('php', TOOL_CANDIDATES.php);
  const composerCmd = requireCommand('composer', TOOL_CANDIDATES.composer);
  const npmCmd = requireCommand('npm', TOOL_CANDIDATES.npm);
  const bootstrapState = readBootstrapState();

  const apiInstallHash = computeCombinedHash([
    path.join(PATHS.apiDir, 'composer.lock'),
    path.join(PATHS.apiDir, 'composer.json'),
  ]);
  const frontendInstallHash = computeCombinedHash([
    path.join(PATHS.frontendDir, 'package-lock.json'),
    path.join(PATHS.frontendDir, 'package.json'),
  ]);

  const apiAutoload = path.join(PATHS.apiDir, 'vendor', 'autoload.php');
  const shouldInstallApi = !fs.existsSync(apiAutoload) || bootstrapState.apiInstallHash !== apiInstallHash;
  if (shouldInstallApi) {
    const reason = fs.existsSync(apiAutoload) ? 'lockfile changed' : 'vendor missing';
    console.log(`Installing API dependencies (composer install, ${reason})...`);
    runCommand(composerCmd, ['install', '--no-interaction', '--prefer-dist'], {
      cwd: PATHS.apiDir,
    });
  }

  const frontendNodeModules = path.join(PATHS.frontendDir, 'node_modules');
  const shouldInstallFrontend = !fs.existsSync(frontendNodeModules)
    || bootstrapState.frontendInstallHash !== frontendInstallHash;
  if (shouldInstallFrontend) {
    const reason = fs.existsSync(frontendNodeModules) ? 'lockfile changed' : 'node_modules missing';
    console.log(`Installing frontend dependencies (npm install, ${reason})...`);
    runCommand(npmCmd, ['install'], {
      cwd: PATHS.frontendDir,
    });
  }

  writeBootstrapState({
    apiInstallHash,
    frontendInstallHash,
    updatedAt: new Date().toISOString(),
  });

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

async function resolveLocalPorts() {
  const reserved = new Set();
  const ports = {};

  for (const serviceName of ['api', 'frontend']) {
    const preferredPort = SERVICES[serviceName].defaultPort;
    const selectedPort = await findFirstFreePort(preferredPort, reserved, 100);
    if (!selectedPort) {
      throw new Error(`No free port found for ${serviceName} near ${preferredPort}.`);
    }

    if (selectedPort !== preferredPort) {
      const pid = findPidListeningOnLocalhost(preferredPort);
      const pidHint = pid ? ` (pid ${pid})` : '';
      console.log(
        `Port ${preferredPort} is already in use for ${serviceName}${pidHint}. Using ${selectedPort} instead.`,
      );
    }

    ports[serviceName] = selectedPort;
    reserved.add(selectedPort);
  }

  return ports;
}

async function findFirstFreePort(startPort, reservedPorts = new Set(), maxAttempts = 100) {
  for (let port = startPort; port < startPort + maxAttempts; port += 1) {
    if (reservedPorts.has(port)) {
      continue;
    }
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return port;
    }
  }
  return null;
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

function readBootstrapState() {
  if (!fs.existsSync(PATHS.bootstrapStateFile)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(PATHS.bootstrapStateFile, 'utf8'));
  } catch (_error) {
    return {};
  }
}

function writeBootstrapState(state) {
  ensureStateDirectories();
  fs.writeFileSync(PATHS.bootstrapStateFile, `${JSON.stringify(state, null, 2)}${os.EOL}`, 'utf8');
}

function computeCombinedHash(filePaths) {
  const hash = createHash('sha256');
  let anyFile = false;

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    hash.update(fs.readFileSync(filePath));
    anyFile = true;
  }

  if (!anyFile) {
    return null;
  }

  return hash.digest('hex');
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

  const apiUrl = state?.services?.api?.url
    ?? buildServiceHealthUrl('api', getServicePort('api', state));
  const frontendUrl = state?.services?.frontend?.url
    ?? buildServiceHealthUrl('frontend', getServicePort('frontend', state));
  const [apiHealthy, frontendHealthy] = await Promise.all([
    isHttpHealthy(apiUrl),
    isHttpHealthy(frontendUrl),
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
  } catch (error) {
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      // Process exists but current user cannot signal it.
      return true;
    }
    return false;
  }
}

async function killProcessTree(pid) {
  if (!pid) {
    return true;
  }

  if (WINDOWS) {
    const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    if (result.error) {
      return false;
    }
    return !isPidRunning(pid);
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch (_error) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (_ignored) {
      return !isPidRunning(pid);
    }
  }

  await sleep(500);

  if (!isPidRunning(pid)) {
    return true;
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

  return !isPidRunning(pid);
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

function startAttachedProcess({ command, args, cwd, label, extraEnv = {} }) {
  const prepared = prepareSpawn(command, args);
  console.log(`Starting ${label} in foreground: ${formatCommand(command, args)}`);

  const child = spawn(prepared.command, prepared.args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    windowsHide: true,
    stdio: 'inherit',
  });

  if (!child.pid) {
    throw new Error(`Failed to start ${label} process.`);
  }

  return child;
}

async function waitForForegroundShutdown(children) {
  await new Promise((resolve, reject) => {
    let settled = false;

    const onSigint = () => {
      void cleanupAndResolve();
    };
    const onSigterm = () => {
      void cleanupAndResolve();
    };

    const removeSignalHandlers = () => {
      process.removeListener('SIGINT', onSigint);
      process.removeListener('SIGTERM', onSigterm);
    };

    const cleanupAndResolve = async () => {
      if (settled) {
        return;
      }
      settled = true;
      removeSignalHandlers();
      await stopChildProcesses(children.map((item) => item.child));
      removeFileIfExists(PATHS.stateFile);
      resolve();
    };

    const cleanupAndReject = async (error) => {
      if (settled) {
        return;
      }
      settled = true;
      removeSignalHandlers();
      await stopChildProcesses(children.map((item) => item.child));
      removeFileIfExists(PATHS.stateFile);
      reject(error);
    };

    process.once('SIGINT', onSigint);
    process.once('SIGTERM', onSigterm);

    for (const item of children) {
      item.child.once('exit', (code, signal) => {
        if (settled) {
          return;
        }

        if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') {
          void cleanupAndResolve();
          return;
        }

        const reason = signal ? `signal=${signal}` : `code=${code}`;
        void cleanupAndReject(new Error(`${item.name} exited unexpectedly (${reason}).`));
      });
    }
  });
}

async function stopChildProcesses(children) {
  for (const child of children) {
    const pid = child?.pid;
    if (!pid) {
      continue;
    }
    await killProcessTree(pid);
  }
}

async function stopOrphanLocalProcesses(options = {}) {
  const { silent = false } = options;
  let stopped = 0;

  for (const serviceName of ['frontend', 'api']) {
    const service = SERVICES[serviceName];
    const pid = findPidListeningOnLocalhost(service.defaultPort);
    if (!pid || !isPidRunning(pid)) {
      continue;
    }

    if (!silent) {
      console.log(`Stopping orphan ${serviceName} on 127.0.0.1:${service.defaultPort} (pid ${pid})...`);
    }
    const killed = await killProcessTree(pid);
    if (killed) {
      stopped += 1;
    } else if (!silent) {
      console.log(`Warning: unable to stop orphan ${serviceName} pid ${pid}. Try from an elevated terminal.`);
    }
  }

  return stopped;
}

function findPidListeningOnLocalhost(port) {
  if (WINDOWS) {
    return findPidListeningOnLocalhostWindows(port);
  }
  return findPidListeningOnLocalhostUnix(port);
}

function findPidListeningOnLocalhostWindows(port) {
  const result = spawnSync('netstat', ['-ano', '-p', 'tcp'], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.error || result.status !== 0) {
    return null;
  }

  const pattern = new RegExp(
    `^\\s*TCP\\s+(?:127\\.0\\.0\\.1|0\\.0\\.0\\.0|\\[::1\\]|\\[::\\]):${port}\\s+(?:0\\.0\\.0\\.0:0|\\[::\\]:0)\\s+\\S+\\s+(\\d+)\\s*$`,
    'im',
  );
  const match = result.stdout.match(pattern);
  if (!match) {
    return null;
  }

  const pid = Number.parseInt(match[1], 10);
  return Number.isFinite(pid) ? pid : null;
}

function findPidListeningOnLocalhostUnix(port) {
  const lsof = findCommand(['lsof']);
  if (!lsof) {
    return null;
  }

  const output = captureCommand(lsof, ['-nP', `-iTCP@127.0.0.1:${port}`, '-sTCP:LISTEN', '-t']);
  const candidate = firstLine(output);
  if (!candidate) {
    return null;
  }

  const pid = Number.parseInt(candidate, 10);
  return Number.isFinite(pid) ? pid : null;
}

function startDetachedProcess({ command, args, cwd, logFile, label, extraEnv = {} }) {
  ensureStateDirectories();
  appendLog(
    logFile,
    `[${new Date().toISOString()}] starting ${label}: ${formatCommand(command, args)}`,
  );

  const prepared = prepareSpawn(command, args);
  const logFd = fs.openSync(logFile, 'a');

  const child = spawn(prepared.command, prepared.args, {
    cwd,
    env: { ...process.env, ...extraEnv },
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

function resolveCommandDetails(candidates) {
  for (const candidate of candidates) {
    const resolvedPath = resolveCommandPath(candidate);
    if (resolvedPath) {
      return { command: candidate, path: resolvedPath };
    }
  }
  return null;
}

function commandExists(command) {
  return resolveCommandPath(command) !== null;
}

function resolveCommandPath(command) {
  if (!command) {
    return null;
  }

  const commandHasPath = command.includes('/') || command.includes('\\');
  if (commandHasPath || path.isAbsolute(command)) {
    const absolutePath = path.isAbsolute(command) ? command : path.resolve(REPO_ROOT, command);
    return isRegularFile(absolutePath) ? absolutePath : null;
  }

  const pathEntries = (process.env.PATH ?? '')
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (pathEntries.length === 0) {
    return null;
  }

  const candidates = buildCommandCandidates(command);
  for (const directory of pathEntries) {
    for (const candidate of candidates) {
      const fullPath = path.join(directory, candidate);
      if (isRegularFile(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

function buildCommandCandidates(command) {
  if (!WINDOWS) {
    return [command];
  }

  if (path.extname(command)) {
    return [command];
  }

  const pathExt = (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const candidates = [command];
  for (const ext of pathExt) {
    candidates.push(`${command}${ext.toLowerCase()}`);
    candidates.push(`${command}${ext.toUpperCase()}`);
  }

  return candidates;
}

function isRegularFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch (_error) {
    return false;
  }
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

function getServicePort(serviceName, state = null) {
  return state?.services?.[serviceName]?.port ?? SERVICES[serviceName].defaultPort;
}

function getServicePortsFromState(state = null) {
  return {
    api: getServicePort('api', state),
    frontend: getServicePort('frontend', state),
  };
}

function buildServiceBaseUrl(port) {
  return `http://127.0.0.1:${port}`;
}

function buildServiceHealthUrl(serviceName, port) {
  return `${buildServiceBaseUrl(port)}${SERVICES[serviceName].healthPath}`;
}

function printSuccessEndpoints(modeLabel, servicePorts = null) {
  const ports = servicePorts ?? getServicePortsFromState(null);
  console.log(`${modeLabel} services are ready:`);
  console.log(`- API: ${buildServiceBaseUrl(ports.api)}`);
  console.log(`- Frontend: ${buildServiceBaseUrl(ports.frontend)}`);
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
