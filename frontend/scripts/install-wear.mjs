/**
 * 워치에만 워치 앱을 설치한다.
 *
 * `./gradlew :wear:installDebug`는 붙어 있는 **모든** 기기에 설치한다. :app과
 * :wear의 applicationId가 둘 다 com.wecandoit이라(Data Layer가 같은 패키지·서명만
 * 연결한다) 폰과 워치가 같이 붙어 있으면 폰 앱이 워치 앱으로 덮인다.
 * 그래서 빌드만 gradle에 맡기고 설치는 대상을 지정해 adb로 한다.
 *
 * 사용: npm run wear:install [-- --serial <시리얼>]
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

import adbDevices from './lib/adb-devices.js';
import {
  adbPath,
  gradlew,
  requireAdb,
  resolveTarget,
  root,
  run,
} from './lib/adb.mjs';

const APK = path.join(
  root,
  'android',
  'wear',
  'build',
  'outputs',
  'apk',
  'debug',
  'wear-debug.apk',
);

const { serial } = adbDevices.parseArgs(process.argv.slice(2));

await requireAdb();

// 기기를 먼저 정한다. 몇 분 빌드한 뒤에 대상이 없다고 멈추면 시간만 버린다.
const target = await resolveTarget('watch', serial);

console.log('워치 앱을 빌드한다...');
const buildCode = await run(gradlew(), [':wear:assembleDebug'], {
  cwd: path.join(root, 'android'),
});

if (buildCode !== 0) {
  process.exit(buildCode);
}

if (!existsSync(APK)) {
  console.error(`빌드는 끝났는데 APK가 없다: ${APK}`);
  process.exit(1);
}

console.log(`${target}에 설치한다...`);
const installCode = await run(adbPath(), ['-s', target, 'install', '-r', APK]);

if (installCode !== 0) {
  process.exit(installCode);
}

console.log('워치 앱 설치 완료. 폰 앱은 그대로다.');
