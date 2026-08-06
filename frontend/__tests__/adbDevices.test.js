/**
 * @format
 */

const {
  buildOnlyTask,
  findBySerial,
  hasExplicitTasks,
  hasWatchCharacteristic,
  hasWatchFeature,
  parseArgs,
  parseDevices,
  readyDevices,
  selectTarget,
} = require('../scripts/lib/adb-devices');

/** 폰과 워치가 같이 붙어 있는 상태. 이 조합이 앱을 덮어쓰던 원인이다. */
const PHONE = { serial: 'R3CT30ABCDE', state: 'device', isWatch: false };
const WATCH = { serial: '192.168.0.31:41235', state: 'device', isWatch: true };

describe('parseDevices', () => {
  test('헤더를 빼고 시리얼과 상태를 읽는다', () => {
    const stdout = [
      'List of devices attached',
      'R3CT30ABCDE\tdevice',
      '192.168.0.31:41235\tdevice',
      '',
    ].join('\n');

    expect(parseDevices(stdout)).toEqual([
      { serial: 'R3CT30ABCDE', state: 'device' },
      { serial: '192.168.0.31:41235', state: 'device' },
    ]);
  });

  test('데몬을 새로 띄울 때 끼는 안내 줄을 기기로 세지 않는다', () => {
    const stdout = [
      '* daemon not running; starting now at tcp:5037',
      '* daemon started successfully',
      'List of devices attached',
      'R3CT30ABCDE\tdevice',
    ].join('\n');

    expect(parseDevices(stdout)).toEqual([
      { serial: 'R3CT30ABCDE', state: 'device' },
    ]);
  });

  test('붙은 기기가 없으면 빈 목록이다', () => {
    expect(parseDevices('List of devices attached\n\n')).toEqual([]);
  });

  test('offline·unauthorized 상태도 그대로 읽어둔다', () => {
    // 설치는 못 걸지만, 왜 못 걸었는지 알려주려면 목록에 있어야 한다.
    const stdout = [
      'List of devices attached',
      '192.168.0.31:41235\toffline',
      'R3CT30ABCDE\tunauthorized',
    ].join('\n');

    expect(parseDevices(stdout)).toEqual([
      { serial: '192.168.0.31:41235', state: 'offline' },
      { serial: 'R3CT30ABCDE', state: 'unauthorized' },
    ]);
  });

  test('설치를 걸 수 있는 기기만 걸러낸다', () => {
    const devices = parseDevices(
      [
        'List of devices attached',
        'R3CT30ABCDE\tdevice',
        '192.168.0.31:41235\toffline',
      ].join('\n'),
    );

    expect(readyDevices(devices)).toEqual([
      { serial: 'R3CT30ABCDE', state: 'device' },
    ]);
  });
});

describe('워치 판별', () => {
  test('feature 목록에 워치 feature가 있으면 워치다', () => {
    const stdout = [
      'feature:android.hardware.bluetooth',
      'feature:android.hardware.type.watch',
      'feature:reqGlEsVersion=0x30002',
    ].join('\n');

    expect(hasWatchFeature(stdout)).toBe(true);
  });

  test('adb shell이 붙이는 \\r에 걸리지 않는다', () => {
    expect(hasWatchFeature('feature:android.hardware.type.watch\r\n')).toBe(
      true,
    );
  });

  test('폰의 feature 목록에는 없다', () => {
    const stdout = [
      'feature:android.hardware.telephony',
      'feature:android.hardware.type.pc',
    ].join('\n');

    expect(hasWatchFeature(stdout)).toBe(false);
  });

  test('characteristics는 쉼표로 갈라 정확히 비교한다', () => {
    expect(hasWatchCharacteristic('nosdcard,watch\n')).toBe(true);
    expect(hasWatchCharacteristic('watch')).toBe(true);
    expect(hasWatchCharacteristic('phone\n')).toBe(false);
    // 'watchdog' 같은 값이 섞여도 부분 일치로 워치가 되면 안 된다.
    expect(hasWatchCharacteristic('nosdcard,watchdog')).toBe(false);
  });
});

describe('selectTarget', () => {
  test('폰과 워치가 같이 붙어 있어도 워치를 고른다', () => {
    expect(selectTarget([PHONE, WATCH], 'watch')).toEqual({
      ok: true,
      serial: WATCH.serial,
    });
  });

  test('폰과 워치가 같이 붙어 있어도 폰을 고른다', () => {
    expect(selectTarget([PHONE, WATCH], 'phone')).toEqual({
      ok: true,
      serial: PHONE.serial,
    });
  });

  test('원하는 종류가 없으면 고르지 않는다', () => {
    // 폰만 붙은 상태에서 워치 설치를 걸면, 폰에 워치 앱을 넣는 대신 멈춰야 한다.
    const result = selectTarget([PHONE], 'watch');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('워치');
    // 왜 못 골랐는지 알 수 있게 보고 있는 기기를 적어준다.
    expect(result.message).toContain(PHONE.serial);
  });

  test('아무 기기도 없으면 그 사실을 알려준다', () => {
    const result = selectTarget([], 'phone');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('기기가 없다');
  });

  test('같은 종류가 둘 이상이면 고르지 않고 시리얼을 보여준다', () => {
    const otherPhone = { ...PHONE, serial: 'R3CT30ZZZZZ' };
    const result = selectTarget([PHONE, otherPhone], 'phone');

    expect(result.ok).toBe(false);
    expect(result.message).toContain(PHONE.serial);
    expect(result.message).toContain(otherPhone.serial);
    expect(result.message).toContain('--serial');
  });

  test('offline인 기기는 대상으로 세지 않는다', () => {
    const result = selectTarget([{ ...WATCH, state: 'offline' }], 'watch');

    expect(result.ok).toBe(false);
    // 무선 디버깅이 끊긴 게 가장 흔한 원인이라 붙이는 법을 같이 적는다.
    expect(result.message).toContain('adb connect');
  });

  test('준비된 기기가 하나면 offline이 섞여 있어도 고른다', () => {
    const staleWatch = {
      ...WATCH,
      serial: '192.168.0.31:5555',
      state: 'offline',
    };

    expect(selectTarget([staleWatch, WATCH], 'watch')).toEqual({
      ok: true,
      serial: WATCH.serial,
    });
  });
});

describe('findBySerial', () => {
  test('지정한 기기를 그대로 쓴다', () => {
    expect(findBySerial([PHONE, WATCH], WATCH.serial)).toEqual({
      ok: true,
      serial: WATCH.serial,
    });
  });

  test('종류는 검사하지 않는다', () => {
    // 판별이 틀렸을 때 사람이 넘어갈 수 있는 탈출구여야 한다.
    expect(findBySerial([PHONE], PHONE.serial).ok).toBe(true);
  });

  test('없는 시리얼이면 멈춘다', () => {
    const result = findBySerial([PHONE], '없는시리얼');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('없는시리얼');
  });

  test('offline인 기기를 지정하면 멈춘다', () => {
    const result = findBySerial([{ ...WATCH, state: 'offline' }], WATCH.serial);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('offline');
  });
});

describe('buildOnlyTask', () => {
  // install 태스크가 넘어가면 gradle이 모든 기기에 설치해 워치 앱을 덮는다.
  test('지정이 없으면 debug를 조립한다', () => {
    expect(buildOnlyTask(['--no-packager'])).toBe('assembleDebug');
  });

  test('--mode를 따라간다', () => {
    expect(buildOnlyTask(['--mode', 'release'])).toBe('assembleRelease');
  });

  test('--mode=값 형태도 받는다', () => {
    expect(buildOnlyTask(['--mode=release'])).toBe('assembleRelease');
  });

  test('--mode에 값이 빠져 있으면 debug로 둔다', () => {
    expect(buildOnlyTask(['--mode'])).toBe('assembleDebug');
  });

  test('어떤 경우에도 install 태스크를 만들지 않는다', () => {
    for (const argv of [[], ['--mode'], ['--mode', 'release'], ['--mode=x']]) {
      expect(buildOnlyTask(argv)).toMatch(/^assemble/);
    }
  });
});

describe('hasExplicitTasks', () => {
  test('사람이 준 --tasks를 알아본다', () => {
    expect(hasExplicitTasks(['--tasks', 'installDebug'])).toBe(true);
    expect(hasExplicitTasks(['--tasks=installDebug'])).toBe(true);
  });

  test('없으면 false다', () => {
    expect(hasExplicitTasks(['--mode', 'release'])).toBe(false);
  });
});

describe('parseArgs', () => {
  test('--serial만 떼어내고 나머지는 넘긴다', () => {
    expect(parseArgs(['--serial', 'R3CT30ABCDE', '--mode', 'release'])).toEqual(
      {
        serial: 'R3CT30ABCDE',
        rest: ['--mode', 'release'],
      },
    );
  });

  test('--serial=값 형태도 받는다', () => {
    expect(parseArgs(['--serial=R3CT30ABCDE'])).toEqual({
      serial: 'R3CT30ABCDE',
      rest: [],
    });
  });

  test('지정이 없으면 null이다', () => {
    expect(parseArgs(['--active-arch-only'])).toEqual({
      serial: null,
      rest: ['--active-arch-only'],
    });
  });

  test('두 번 붙은 구분자는 흘려보낸다', () => {
    // `npm run android -- -- --foo`로 들어오면 CLI가 '--'를 인자로 읽어 죽는다.
    expect(parseArgs(['--', '--active-arch-only'])).toEqual({
      serial: null,
      rest: ['--active-arch-only'],
    });
  });
});
