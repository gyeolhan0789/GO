/**
 * 기기 걸음 센서(TYPE_STEP_COUNTER) 값을 날짜별 걸음으로 정리하는 원장.
 *
 * 센서 원시값은 "마지막 재부팅 이후 누적"이라 그 자체로는 오늘 걸음이 아니다. 게다가
 * 앱이 떠 있을 때만 읽을 수 있어서, 두 번의 읽기 사이에 자정이 지나거나 재부팅이
 * 있으면 그 구간을 어느 날로 넣을지 정해야 한다. 규칙은 두 가지다.
 *
 * - 자정 경과: 직전 읽기 시점까지는 그 날 몫으로 확정하고, 이후 증가분은 새 날짜에
 *   넣는다. 밤에 앱을 안 봤으면 그만큼이 다음 날로 밀리지만 **걸음을 잃지는 않는다**
 *   (센서 baseline을 날짜마다 리셋하던 예전 방식은 그 구간을 통째로 버렸다).
 * - 재부팅: 원시값이 0으로 리셋된다. 부팅 이후 경과시간이 직전보다 작으면 재부팅으로
 *   보고, 새 원시값을 그대로 증가분으로 받는다(재부팅~첫 읽기 사이 걸음만 유실).
 *
 * 이 파일은 전부 순수 함수다. 저장은 stepLedgerStorage, 전송은 dailyHistoryUpload가 맡는다.
 */

/** 걸음 센서 한 번 읽은 값. */
export type StepCounterReading = {
  /** 마지막 재부팅 이후 누적 걸음. */
  steps: number;
  /** 부팅 이후 경과시간(ms). 재부팅을 감지하는 데만 쓴다. */
  elapsedRealtimeMs: number;
};

/** 마지막으로 읽은 값. 다음 읽기의 증가분을 구하는 기준이 된다. */
export type StepCounterSnapshot = StepCounterReading & {
  /** 그 읽기가 어느 날짜에 반영됐는지. 'yyyy-MM-dd'. */
  date: string;
};

export type StepLedgerDay = {
  /** 'yyyy-MM-dd'. */
  date: string;
  /** 그날 걸은 것으로 집계된 걸음. */
  steps: number;
  /** 그 날짜로 이미 서버에 반영된 걸음. 산책 완료분과 전송한 몫이 여기 쌓인다. */
  reportedSteps: number;
};

export type StepLedger = {
  snapshot: StepCounterSnapshot | null;
  /** 날짜 오름차순. */
  days: StepLedgerDay[];
};

/**
 * 원장에 남겨두는 날짜 수. 서버 전송이 밀린 날을 따라잡을 만큼은 남기고, 무한히
 * 늘어나지 않게 자른다.
 */
export const LEDGER_RETENTION_DAYS = 14;

export const EMPTY_STEP_LEDGER: StepLedger = { snapshot: null, days: [] };

function emptyDay(date: string): StepLedgerDay {
  return { date, steps: 0, reportedSteps: 0 };
}

function findDay(ledger: StepLedger, date: string): StepLedgerDay | undefined {
  return ledger.days.find(day => day.date === date);
}

/** 날짜 오름차순을 유지하며 그 날짜만 바꿔 끼운다. */
function withDay(ledger: StepLedger, next: StepLedgerDay): StepLedgerDay[] {
  const others = ledger.days.filter(day => day.date !== next.date);

  return [...others, next].sort((a, b) => a.date.localeCompare(b.date));
}

function trimToRetention(days: StepLedgerDay[]): StepLedgerDay[] {
  return days.slice(-LEDGER_RETENTION_DAYS);
}

/**
 * 직전 읽기 이후 늘어난 걸음.
 *
 * 재부팅했으면(경과시간이 되감김) 원시값 자체가 부팅 이후 누적이므로 그게 증가분이다.
 * 재부팅이 아닌데도 값이 줄었으면 센서가 리셋된 것으로 보고 같게 다룬다.
 */
export function stepsSinceSnapshot(
  snapshot: StepCounterSnapshot | null,
  reading: StepCounterReading,
): number {
  if (snapshot === null) {
    return 0;
  }

  const rebooted =
    reading.elapsedRealtimeMs < snapshot.elapsedRealtimeMs ||
    reading.steps < snapshot.steps;

  return Math.max(0, rebooted ? reading.steps : reading.steps - snapshot.steps);
}

/**
 * 센서를 한 번 읽은 결과를 원장에 반영한다.
 *
 * 첫 읽기는 기준점만 잡고 걸음을 더하지 않는다 — 그 시점의 원시값이 며칠분 누적일 수
 * 있어서, 증가분을 알 수 없는 첫 값을 오늘로 몰면 걸음이 폭증한다.
 */
export function applyStepReading(
  ledger: StepLedger,
  reading: StepCounterReading,
  todayIsoDate: string,
): StepLedger {
  const gained = stepsSinceSnapshot(ledger.snapshot, reading);
  const target = findDay(ledger, todayIsoDate) ?? emptyDay(todayIsoDate);
  const next: StepLedgerDay = { ...target, steps: target.steps + gained };

  return {
    snapshot: { ...reading, date: todayIsoDate },
    days: trimToRetention(withDay(ledger, next)),
  };
}

/**
 * 그 날짜로 서버에 반영된 걸음을 더한다. 산책 완료(서버가 완료 처리 안에서 그날 합계에
 * 더한다)와 일일 기록 전송 성공이 모두 이 함수를 통한다.
 */
export function markStepsReported(
  ledger: StepLedger,
  date: string,
  steps: number,
): StepLedger {
  const target = findDay(ledger, date) ?? emptyDay(date);
  const next: StepLedgerDay = {
    ...target,
    reportedSteps: target.reportedSteps + Math.max(0, steps),
  };

  return { ...ledger, days: trimToRetention(withDay(ledger, next)) };
}

/** 그날 집계된 걸음. 원장에 없는 날은 0. */
export function stepsOn(ledger: StepLedger, date: string): number {
  return findDay(ledger, date)?.steps ?? 0;
}

/**
 * 아직 서버에 안 올린 걸음이 남은, 이미 지난 날짜들.
 *
 * 오늘은 제외한다 — 하루가 끝나기 전에 올리면 이후 걸음을 또 올려야 하고, 서버
 * `POST /histories`가 누적이라 그때마다 델타를 다시 계산해야 한다. 하루가 끝난 뒤
 * 한 번에 확정해 올린다.
 */
export function pendingStepUploads(
  ledger: StepLedger,
  todayIsoDate: string,
): { date: string; steps: number }[] {
  return ledger.days
    .filter(day => day.date < todayIsoDate && day.steps > day.reportedSteps)
    .map(day => ({ date: day.date, steps: day.steps - day.reportedSteps }));
}
