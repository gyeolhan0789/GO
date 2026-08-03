/** adb·gradle·react-native를 실제로 실행하는 자리. 판별 로직은 adb-devices.js. */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import adbDevices from './adb-devices.js';

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const isWindows = process.platform === 'win32';

/** PATH에 adb가 없는 흔한 경우를 SDK 경로로 메운다. */
function resolveAdb() {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;

  if (sdk) {
    const candidate = path.join(
      sdk,
      'platform-tools',
      isWindows ? 'adb.exe' : 'adb',
    );
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return 'adb';
}

/** node_modules/.bin은 npm run으로 실행할 때만 PATH에 들어와서 직접 짚는다. */
export function localBin(name) {
  return path.join(
    root,
    'node_modules',
    '.bin',
    isWindows ? `${name}.cmd` : name,
  );
}

export function gradlew() {
  return path.join(root, 'android', isWindows ? 'gradlew.bat' : 'gradlew');
}

/** 출력을 그대로 콘솔에 흘리고 종료 코드만 돌려준다. */
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('close', code => resolve(code ?? 1));
  });
}

/** 출력을 읽어야 하는 명령. 실패하면 빈 문자열로 둔다(판별은 fail-closed). */
function capture(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let stdout = '';

    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.on('error', () => resolve({ ok: false, stdout: '' }));
    child.on('close', code => resolve({ ok: code === 0, stdout }));
  });
}

const adb = resolveAdb();

/** adb가 아예 없으면 여기서 끊는다. 이후 판별이 전부 빈 출력이 되기 때문이다. */
export async function requireAdb() {
  const { ok } = await capture(adb, ['version']);

  if (!ok) {
    console.error(
      [
        'adb를 실행할 수 없다.',
        'Android SDK platform-tools를 PATH에 넣거나 ANDROID_HOME을 설정해라.',
      ].join('\n'),
    );
    process.exit(1);
  }
}

/**
 * 붙어 있는 기기 목록. 준비된 기기에는 워치인지까지 붙인다.
 * 판별은 워치 매니페스트가 요구하는 feature를 1순위로 본다.
 */
export async function listDevices() {
  const { stdout } = await capture(adb, ['devices']);
  const devices = adbDevices.parseDevices(stdout);

  return Promise.all(
    devices.map(async device => {
      if (device.state !== adbDevices.READY_STATE) {
        return device;
      }

      const features = await capture(adb, [
        '-s',
        device.serial,
        'shell',
        'pm',
        'list',
        'features',
      ]);

      if (features.ok && adbDevices.hasWatchFeature(features.stdout)) {
        return { ...device, isWatch: true, signal: 'pm list features' };
      }

      // feature 목록을 못 읽었을 때만 2순위로 내려간다. 읽었는데 없으면 폰이다.
      if (features.ok) {
        return { ...device, isWatch: false, signal: 'pm list features' };
      }

      const characteristics = await capture(adb, [
        '-s',
        device.serial,
        'shell',
        'getprop',
        'ro.build.characteristics',
      ]);

      return {
        ...device,
        isWatch:
          characteristics.ok &&
          adbDevices.hasWatchCharacteristic(characteristics.stdout),
        signal: 'ro.build.characteristics',
      };
    }),
  );
}

/**
 * `--serial`이 있으면 그 기기를, 없으면 종류로 하나를 고른다.
 * 정하지 못하면 이유를 찍고 종료한다 — 덮어쓰기보다 실패가 낫다.
 */
export async function resolveTarget(kind, serial) {
  const devices = await listDevices();
  const result = serial
    ? adbDevices.findBySerial(devices, serial)
    : adbDevices.selectTarget(devices, kind);

  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }

  const target = devices.find(device => device.serial === result.serial);
  const how = serial ? '--serial 지정' : target?.signal ?? '판별';
  console.log(`대상: ${result.serial} (${how})`);

  return result.serial;
}

export function adbPath() {
  return adb;
}
