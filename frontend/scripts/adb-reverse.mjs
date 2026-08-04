/**
 * 폰에만 8080 포트를 역방향 연결한다.
 *
 * `adb reverse`는 대상을 지정하지 않으면 기기가 둘 이상일 때 그냥 죽는다
 * ("more than one device"). 워치를 같이 붙여두고 개발하는 동안 이 명령만
 * 못 쓰게 되는 걸 막는다.
 *
 * 사용: npm run android:reverse [-- --serial <시리얼>]
 */

import adbDevices from './lib/adb-devices.js';
import { adbPath, requireAdb, resolveTarget, run } from './lib/adb.mjs';

const PORT = 8080;

const { serial } = adbDevices.parseArgs(process.argv.slice(2));

await requireAdb();

const target = await resolveTarget('phone', serial);
const code = await run(adbPath(), [
  '-s',
  target,
  'reverse',
  `tcp:${PORT}`,
  `tcp:${PORT}`,
]);

if (code !== 0) {
  process.exit(code);
}

console.log(`${target}의 tcp:${PORT}를 개발 머신으로 연결했다.`);
