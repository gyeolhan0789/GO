/**
 * 폰에만 폰 앱을 설치·실행한다.
 *
 * `react-native run-android`도 결국 Gradle installDebug를 타서 붙어 있는 모든
 * 기기에 설치한다. 워치가 같이 붙어 있으면 워치 앱이 폰 앱으로 덮인다
 * (scripts/install-wear.mjs의 설명 참고). 그래서 폰을 골라 --deviceId로 넘긴다.
 *
 * `--deviceId`만으로는 부족하다. CLI는 그 값을 마지막 `adb install`에만 쓰고,
 * gradle에는 여전히 install 태스크를 돌린다. 대상 지정이 없는 gradle install은
 * 붙어 있는 모든 기기에 설치한다 — 실측으로 "Installed on 2 devices"가 찍히며
 * 워치 앱이 덮였다. 그래서 gradle에는 assemble만 시키고 설치는 CLI가 대상을
 * 지정해 도는 adb에 맡긴다.
 *
 * 기기가 하나도 없으면 기존 동작 그대로 넘긴다 — 그때는 CLI가 에뮬레이터를 띄운다.
 *
 * 사용: npm run android:dev [-- --serial <시리얼>] [그 밖의 run-android 옵션]
 */

import adbDevices from './lib/adb-devices.js';
import {
  listDevices,
  localBin,
  requireAdb,
  resolveTarget,
  run,
} from './lib/adb.mjs';

const { serial, rest } = adbDevices.parseArgs(process.argv.slice(2));

await requireAdb();

const devices = await listDevices();
const deviceArgs = [];

if (devices.length === 0) {
  console.log('붙어 있는 기기가 없다. 에뮬레이터를 띄우도록 CLI에 넘긴다.');
} else {
  const target = await resolveTarget('phone', serial);
  deviceArgs.push('--deviceId', target);

  if (!adbDevices.hasExplicitTasks(rest)) {
    deviceArgs.push('--tasks', adbDevices.buildOnlyTask(rest));
  }
}

const code = await run(localBin('react-native'), [
  'run-android',
  ...deviceArgs,
  ...rest,
]);

process.exit(code);
