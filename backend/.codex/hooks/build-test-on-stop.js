#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function readPayload() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function findJavaHome() {
  const javaBin = process.platform === 'win32' ? 'java.exe' : 'java';
  if (process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, 'bin', javaBin))) {
    return process.env.JAVA_HOME;
  }

  const candidates = [
    path.join(os.homedir(), '.jdks'),
    path.join(os.homedir(), '.gradle', 'jdks'),
    'C:\\Program Files\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
    '/usr/lib/jvm',
  ];

  for (const directory of candidates) {
    try {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const candidate = path.join(directory, entry.name);
        if (entry.isDirectory() && fs.existsSync(path.join(candidate, 'bin', javaBin))) return candidate;
      }
    } catch {
      // Try the next standard JDK location.
    }
  }

  return null;
}

const payload = readPayload();
if (payload.stop_hook_active) process.exit(0);

const javaHome = findJavaHome();
if (!javaHome) process.exit(0);

const projectRoot = path.resolve(__dirname, '..', '..');
const gradleCommand = path.join(projectRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const result = spawnSync(gradleCommand, ['build'], {
  cwd: projectRoot,
  shell: true,
  timeout: 5 * 60 * 1000,
  encoding: 'utf8',
  env: { ...process.env, JAVA_HOME: javaHome },
});

if (result.error) process.exit(0);
if (result.status === 0) process.exit(0);

const tail = (output) => (output || '').split('\n').slice(-60).join('\n');
process.stderr.write([
  '`gradlew build` failed. Fix build/test failures before finishing this task.',
  '--- stdout (tail) ---',
  tail(result.stdout),
  '--- stderr (tail) ---',
  tail(result.stderr),
].join('\n'));
process.exit(2);
