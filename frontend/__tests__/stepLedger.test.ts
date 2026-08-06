/**
 * @format
 */

import {
  applyStepReading,
  EMPTY_STEP_LEDGER,
  LEDGER_RETENTION_DAYS,
  markStepsReported,
  pendingStepUploads,
  stepsOn,
  type StepLedger,
} from '../src/shared/lib/stepLedger';

const YESTERDAY = '2026-08-05';
const TODAY = '2026-08-06';

/** 부팅 이후 경과시간은 실제로는 계속 늘어난다. 재부팅 테스트만 되감는다. */
function reading(steps: number, elapsedRealtimeMs: number) {
  return { steps, elapsedRealtimeMs };
}

/** 기준점이 잡힌 원장. 첫 읽기는 걸음을 안 더하므로 대부분 테스트가 여기서 시작한다. */
function ledgerAfterFirstReading(): StepLedger {
  return applyStepReading(EMPTY_STEP_LEDGER, reading(5000, 60_000), TODAY);
}

describe('걸음 원장', () => {
  test('첫 읽기는 기준점만 잡고 걸음을 더하지 않는다', () => {
    const ledger = applyStepReading(
      EMPTY_STEP_LEDGER,
      reading(5000, 60_000),
      TODAY,
    );

    // 원시값은 며칠분 누적일 수 있다. 증가분을 모르는 첫 값을 오늘로 몰면 폭증한다.
    expect(stepsOn(ledger, TODAY)).toBe(0);
    expect(ledger.snapshot).toEqual({
      steps: 5000,
      elapsedRealtimeMs: 60_000,
      date: TODAY,
    });
  });

  test('두 번째 읽기부터 직전 값과의 차이를 그날 걸음으로 더한다', () => {
    let ledger = ledgerAfterFirstReading();
    ledger = applyStepReading(ledger, reading(5300, 120_000), TODAY);
    ledger = applyStepReading(ledger, reading(5800, 180_000), TODAY);

    expect(stepsOn(ledger, TODAY)).toBe(800);
  });

  test('재부팅으로 원시값이 되감기면 새 원시값을 증가분으로 받는다', () => {
    let ledger = ledgerAfterFirstReading();
    // 경과시간이 줄었으면 그 사이에 재부팅했고, 원시값도 0부터 다시 센다.
    ledger = applyStepReading(ledger, reading(120, 5_000), TODAY);

    // 예전 방식은 여기서 기준값만 새로 잡고 120걸음을 버렸다.
    expect(stepsOn(ledger, TODAY)).toBe(120);
  });

  test('재부팅 이후에도 이어서 누적한다', () => {
    let ledger = ledgerAfterFirstReading();
    ledger = applyStepReading(ledger, reading(120, 5_000), TODAY);
    ledger = applyStepReading(ledger, reading(400, 90_000), TODAY);

    expect(stepsOn(ledger, TODAY)).toBe(400);
  });

  test('자정을 넘기면 직전 읽기까지는 어제로 두고 이후 증가분만 오늘에 넣는다', () => {
    let ledger = applyStepReading(
      EMPTY_STEP_LEDGER,
      reading(1000, 10_000),
      YESTERDAY,
    );
    ledger = applyStepReading(ledger, reading(4000, 20_000), YESTERDAY);
    // 밤에 앱을 안 보고 다음 날 아침에 열었다.
    ledger = applyStepReading(ledger, reading(4500, 60_000), TODAY);

    expect(stepsOn(ledger, YESTERDAY)).toBe(3000);
    // 어제 밤 몫이 오늘로 밀리지만 걸음 자체는 잃지 않는다.
    expect(stepsOn(ledger, TODAY)).toBe(500);
  });

  test('센서 값이 줄어들어도 걸음이 음수가 되지 않는다', () => {
    let ledger = ledgerAfterFirstReading();
    ledger = applyStepReading(ledger, reading(4000, 120_000), TODAY);

    expect(stepsOn(ledger, TODAY)).toBe(4000);
  });

  test('보관 기간을 넘긴 날짜는 잘라낸다', () => {
    let ledger = EMPTY_STEP_LEDGER;
    for (let day = 1; day <= LEDGER_RETENTION_DAYS + 3; day += 1) {
      const date = `2026-08-${String(day).padStart(2, '0')}`;
      ledger = applyStepReading(ledger, reading(day * 100, day * 1000), date);
    }

    expect(ledger.days).toHaveLength(LEDGER_RETENTION_DAYS);
    expect(ledger.days[0].date).toBe('2026-08-04');
  });

  test('날짜는 오름차순으로 유지된다', () => {
    let ledger = applyStepReading(EMPTY_STEP_LEDGER, reading(10, 10), TODAY);
    ledger = applyStepReading(ledger, reading(20, 20), YESTERDAY);

    expect(ledger.days.map(day => day.date)).toEqual([YESTERDAY, TODAY]);
  });
});

describe('전송 대기 목록', () => {
  function ledgerWith(days: StepLedger['days']): StepLedger {
    return { snapshot: null, days };
  }

  test('하루가 끝난 날짜의 미전송 걸음만 올린다', () => {
    const ledger = ledgerWith([
      { date: YESTERDAY, steps: 3000, reportedSteps: 0 },
      { date: TODAY, steps: 500, reportedSteps: 0 },
    ]);

    // 오늘은 아직 끝나지 않았다. 지금 올리면 이후 걸음을 또 올려야 한다.
    expect(pendingStepUploads(ledger, TODAY)).toEqual([
      { date: YESTERDAY, steps: 3000 },
    ]);
  });

  test('이미 반영된 몫을 뺀 나머지만 올린다', () => {
    const ledger = ledgerWith([
      { date: YESTERDAY, steps: 3000, reportedSteps: 1200 },
    ]);

    expect(pendingStepUploads(ledger, TODAY)).toEqual([
      { date: YESTERDAY, steps: 1800 },
    ]);
  });

  test('산책으로 이미 다 올라간 날은 올리지 않는다', () => {
    // 산책 완료 시 서버가 그날 합계에 더하고, 그 몫이 원장에도 적힌다.
    const ledger = markStepsReported(
      ledgerWith([{ date: YESTERDAY, steps: 3000, reportedSteps: 0 }]),
      YESTERDAY,
      3000,
    );

    // 여기서 또 올리면 그날 기록이 두 배가 된다.
    expect(pendingStepUploads(ledger, TODAY)).toEqual([]);
  });

  test('전송 성공을 반영하면 같은 날짜가 다시 대기하지 않는다', () => {
    let ledger = ledgerWith([
      { date: YESTERDAY, steps: 3000, reportedSteps: 0 },
    ]);
    const [pending] = pendingStepUploads(ledger, TODAY);
    ledger = markStepsReported(ledger, pending.date, pending.steps);

    expect(pendingStepUploads(ledger, TODAY)).toEqual([]);
  });

  test('원장에 없는 날짜에 반영해도 새로 만들어 적어둔다', () => {
    const ledger = markStepsReported(EMPTY_STEP_LEDGER, YESTERDAY, 500);

    expect(ledger.days).toEqual([
      { date: YESTERDAY, steps: 0, reportedSteps: 500 },
    ]);
  });
});
