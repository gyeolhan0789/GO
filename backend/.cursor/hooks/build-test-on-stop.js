#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { readPayload } = require('./hook-common');

const payload = readPayload();

// Avoid infinite stop-hook loops (Claude: stop_hook_active, Cursor: loop_count).
if (payload.stop_hook_active || (payload.loop_count && payload.loop_count > 0)) {
  process.exit(0);
}

const projectRoot = path.resolve(__dirname, '..', '..');
const gradleCmd = path.join(
  projectRoot,
  process.platform === 'win32' ? 'gradlew.bat' : 'gradlew'
);

function findJavaHome() {
  const javaBin = process.platform === 'win32' ? 'java.exe' : 'java';
  const existing = process.env.JAVA_HOME;
  if (existing && fs.existsSync(path.join(existing, 'bin', javaBin))) {
    return existing;
  }

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
    } catch {
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
