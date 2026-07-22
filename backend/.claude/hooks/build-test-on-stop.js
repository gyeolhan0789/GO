#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let raw = '';
try {
  raw = fs.readFileSync(0, 'utf8');
} catch (e) {
  raw = '';
}

let payload = {};
try {
  payload = raw ? JSON.parse(raw) : {};
} catch (e) {
  payload = {};
}

// Avoid an infinite Stop-hook loop: if this hook already fired once for the
// current stop event, let Claude finish instead of re-blocking indefinitely.
if (payload.stop_hook_active) {
  process.exit(0);
}

const projectRoot = path.resolve(__dirname, '..', '..');
// Use an absolute path: some machines set NoDefaultCurrentDirectoryInExePath,
// which stops cmd.exe from resolving a bare "gradlew.bat" via cwd.
const gradleCmd = path.join(projectRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

function findJavaHome() {
  const javaBin = process.platform === 'win32' ? 'java.exe' : 'java';
  const existing = process.env.JAVA_HOME;
  if (existing && fs.existsSync(path.join(existing, 'bin', javaBin))) {
    return existing;
  }

  // No system-wide JAVA_HOME — look for JDKs managed by IDEs (IntelliJ, etc.),
  // which is common when developers never set a global JAVA_HOME.
  const home = require('os').homedir();
  const candidateDirs = [
    path.join(home, '.jdks'),
    path.join(home, '.gradle', 'jdks'),
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
    '/usr/lib/jvm',
  ];

  for (const dir of candidateDirs) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(dir, entry.name);
      if (fs.existsSync(path.join(candidate, 'bin', javaBin))) {
        return candidate;
      }
    }
  }

  return null;
}

const javaHome = findJavaHome();
if (!javaHome) {
  // No JDK found anywhere — this is an environment problem the hook can't
  // fix, not a build failure. Don't block the agent on it.
  process.exit(0);
}

const result = spawnSync(gradleCmd, ['build'], {
  cwd: projectRoot,
  shell: true,
  timeout: 5 * 60 * 1000,
  encoding: 'utf8',
  env: Object.assign({}, process.env, { JAVA_HOME: javaHome }),
});

if (result.error) {
  // Wrapper missing, timed out, etc. — fail open so infra issues never hang the agent.
  process.exit(0);
}

if (result.status !== 0) {
  const tail = (out) => (out || '').split('\n').slice(-60).join('\n');
  process.stderr.write(
    [
      '`gradlew build` failed. Fix the build/test failures before finishing this task.',
      '--- stdout (tail) ---',
      tail(result.stdout),
      '--- stderr (tail) ---',
      tail(result.stderr),
    ].join('\n')
  );
  process.exit(2);
}

process.exit(0);
