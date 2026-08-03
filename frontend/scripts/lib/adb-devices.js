/**
 * `adb` 출력을 해석하고 설치 대상을 고르는 순수 로직.
 *
 * scripts/의 진입점들은 ESM(.mjs)인데 이 파일만 CommonJS인 이유가 있다.
 * `eslint .`는 .mjs를 보지 않고 jest도 기본 설정으로는 .mjs를 테스트에 끌어오지
 * 못한다. 폰과 워치를 잘못 고르면 반대쪽 앱이 지워지는 로직이라 검사를 받는
 * 쪽에 둔다. .mjs 쪽에서는 default import로 가져다 쓴다.
 */

/** 워치 매니페스트가 요구하는 feature. 의미가 정확히 맞는 1순위 신호다. */
const WATCH_FEATURE = 'android.hardware.type.watch';
/** Wear OS는 보통 `nosdcard,watch`로 온다. feature를 못 읽었을 때의 2순위. */
const WATCH_CHARACTERISTIC = 'watch';

/** adb가 설치 준비된 기기에 붙이는 상태. 나머지(offline·unauthorized)는 쓸 수 없다. */
const READY_STATE = 'device';

// 문구를 종류마다 통째로 들고 있다. 조사가 '폰을'/'워치를'로 갈려서 라벨만
// 끼워 넣으면 어느 한쪽이 틀린 문장이 된다.
const DEVICE_KIND = {
  watch: {
    matches: device => device.isWatch,
    notFound: '붙어 있는 워치를 찾지 못했다.',
    tooMany: count =>
      `워치가 ${count}대 붙어 있어서 어디에 설치할지 정할 수 없다.`,
  },
  phone: {
    matches: device => !device.isWatch,
    notFound: '붙어 있는 폰을 찾지 못했다.',
    tooMany: count =>
      `폰이 ${count}대 붙어 있어서 어디에 설치할지 정할 수 없다.`,
  },
};

/**
 * `adb devices` 한 줄을 기기 하나로. 헤더·빈 줄·데몬 안내 줄은 null.
 * adb는 `\t`로 붙이기도 하고 공백으로 붙이기도 해서 공백 묶음으로 자른다.
 */
function parseDeviceLine(line) {
  const trimmed = line.trim();

  if (
    trimmed === '' ||
    trimmed.startsWith('List of devices') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('adb server')
  ) {
    return null;
  }

  const [serial, state] = trimmed.split(/\s+/);
  if (!serial || !state) {
    return null;
  }

  return { serial, state };
}

/** `adb devices` 전체 출력 -> [{serial, state}]. */
function parseDevices(stdout) {
  return stdout.split('\n').map(parseDeviceLine).filter(Boolean);
}

/** 설치를 걸 수 있는 기기만. offline·unauthorized는 여기서 빠진다. */
function readyDevices(devices) {
  return devices.filter(device => device.state === READY_STATE);
}

/** `pm list features` 출력에 워치 feature가 있는지. */
function hasWatchFeature(stdout) {
  return stdout
    .split('\n')
    .some(line => line.trim() === `feature:${WATCH_FEATURE}`);
}

/** `getprop ro.build.characteristics` 출력에 watch가 있는지. */
function hasWatchCharacteristic(stdout) {
  return stdout
    .trim()
    .split(',')
    .some(value => value.trim() === WATCH_CHARACTERISTIC);
}

/** '2c:...:5555 (offline)' 처럼 사람이 읽을 한 줄. */
function describeDevice(device) {
  const kind =
    device.isWatch === undefined ? '' : device.isWatch ? ' [워치]' : ' [폰]';
  const state = device.state === READY_STATE ? '' : ` (${device.state})`;
  return `  - ${device.serial}${kind}${state}`;
}

function describeDevices(devices) {
  return devices.map(describeDevice).join('\n');
}

const RECONNECT_HINT = [
  '워치는 절전으로 무선 디버깅이 끊긴다. 주소를 다시 확인하고 붙여야 한다.',
  '  adb disconnect <워치주소> && adb connect <워치주소>',
  '  (개발자 옵션 -> 무선 디버깅에서 포트가 바뀌었는지 확인)',
].join('\n');

/**
 * 원하는 종류의 기기를 하나만 고른다. 애매하면 고르지 않는다 —
 * 폰과 워치의 applicationId가 같아서 잘못 고르면 반대쪽 앱이 지워진다.
 * 덮어쓰기보다 실패가 낫다.
 */
function selectTarget(devices, kind) {
  const { matches, notFound, tooMany } = DEVICE_KIND[kind];
  const ready = readyDevices(devices);
  const candidates = ready.filter(matches);

  if (candidates.length === 1) {
    return { ok: true, serial: candidates[0].serial };
  }

  if (candidates.length === 0) {
    const lines = [notFound];

    if (devices.length === 0) {
      lines.push('adb에 잡힌 기기가 없다.');
    } else {
      lines.push('adb가 보고 있는 기기:', describeDevices(devices));
    }

    if (kind === 'watch') {
      lines.push(RECONNECT_HINT);
    }

    return { ok: false, message: lines.join('\n') };
  }

  return {
    ok: false,
    message: [
      tooMany(candidates.length),
      describeDevices(candidates),
      '한 대만 남기거나 --serial <시리얼>로 지정해라.',
    ].join('\n'),
  };
}

/**
 * --serial로 직접 지정한 기기를 확인한다. 종류는 검사하지 않는다 — 판별이
 * 틀렸을 때 사람이 넘어갈 수 있는 탈출구여야 한다.
 */
function findBySerial(devices, serial) {
  const device = devices.find(candidate => candidate.serial === serial);

  if (!device) {
    return {
      ok: false,
      message: [
        `${serial}는 adb에 잡히지 않는다.`,
        devices.length === 0
          ? 'adb에 잡힌 기기가 없다.'
          : `adb가 보고 있는 기기:\n${describeDevices(devices)}`,
      ].join('\n'),
    };
  }

  if (device.state !== READY_STATE) {
    return {
      ok: false,
      message: `${serial}는 지금 ${device.state} 상태라 설치할 수 없다.`,
    };
  }

  return { ok: true, serial };
}

/** `--serial <값>`만 떼어내고 나머지는 그대로 넘긴다. */
function parseArgs(argv) {
  const rest = [];
  let serial = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    // `npm run android -- -- --foo`처럼 두 번 붙은 구분자는 CLI가 인자로 읽어
    // 죽는다. 여기서 흘려보낸다.
    if (arg === '--') {
      continue;
    }

    if (arg === '--serial') {
      serial = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--serial=')) {
      serial = arg.slice('--serial='.length) || null;
      continue;
    }

    rest.push(arg);
  }

  return { serial, rest };
}

module.exports = {
  READY_STATE,
  findBySerial,
  hasWatchCharacteristic,
  hasWatchFeature,
  parseArgs,
  parseDevices,
  readyDevices,
  selectTarget,
};
