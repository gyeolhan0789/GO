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

/**
 * 상주 서비스가 자정에 찍어둔 센서 값. 원장은 이걸 그 날짜의 마지막 읽기로 취급한다.
 */
export type StepBoundaryMark = StepCounterReading & {
  /** 이 마크가 닫는 날짜('yyyy-MM-dd'). 자정을 넘기며 **끝난** 날이다. */
  date: string;
};

export type StepLedger = {
  snapshot: StepCounterSnapshot | null;
  /** 날짜 오름차순. */
  days: StepLedgerDay[];
  /**
   * 마지막으로 반영한 자정 마크의 날짜.
   *
   * 같은 마크를 두 번 반영하면 걸음이 폭증한다 — 마크의 원시값은 그때 스냅샷보다 작아서
   * 재부팅으로 오판되고, 증가분이 아니라 원시값 전체가 더해진다. 마크를 지우는 것으로는
   * 못 막는다(지우기 전에 앱이 죽으면 그대로 다시 반영된다). 어디까지 반영했는지를
   * 원장이 직접 들고 있어야 저장소 상태와 무관하게 한 번만 반영된다.
   */
  lastBoundaryDate?: string;
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
    ...ledger,
    snapshot: { ...reading, date: todayIsoDate },
    days: trimToRetention(withDay(ledger, next)),
  };
}

/**
 * 자정 마크들을 반영한다. 각 마크는 "그 날짜의 마지막 읽기"이므로, 직전 스냅샷부터
 * 마크까지의 증가분이 그 날짜 몫으로 확정된다.
 *
 * 이미 반영한 마크(lastBoundaryDate 이하)는 건너뛴다. 두 번 반영하면 마크의 원시값이
 * 스냅샷보다 작아 재부팅으로 오판되고 원시값 전체가 더해진다.
 *
 * lastBoundaryDate가 없는 원장(이 기능 이전에 만들어진 것)은 아무것도 반영하지 않고
 * 오늘로 기준만 세운다. 남아 있던 옛 마크가 한꺼번에 쏟아지는 걸 막는다 — 경계 분리는
 * 다음 자정부터 동작한다.
 */
export function applyBoundaryMarks(
  ledger: StepLedger,
  marks: StepBoundaryMark[],
  todayIsoDate: string,
): StepLedger {
  const lastBoundaryDate = ledger.lastBoundaryDate;
  if (lastBoundaryDate === undefined) {
    return { ...ledger, lastBoundaryDate: todayIsoDate };
  }

  return marks
    .filter(mark => mark.date > lastBoundaryDate)
    .filter(mark => isAfterSnapshot(ledger.snapshot, mark))
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce<StepLedger>(
      (next, mark) => ({
        ...applyStepReading(next, mark, mark.date),
        lastBoundaryDate: mark.date,
      }),
      ledger,
    );
}

/**
 * 스냅샷이 마크보다 나중이면 그 마크 구간은 이미 반영이 끝난 것이다.
 *
 * 날짜(lastBoundaryDate)만으로는 못 거른다 — 자정 마크가 찍힌 **뒤에** 원장이 센서를
 * 읽으면(예: 자정 직후 앱을 잠깐 열었다 옴) 스냅샷이 마크를 지나쳐 있는데 날짜로는
 * 새 마크다. 이걸 반영하면 마크의 경과시간이 스냅샷보다 과거라 재부팅으로 오판되고,
 * 증가분이 아니라 원시값 전체가 통째로 더해진다(실기기에서 6846보 폭증으로 재현).
 *
 * 부팅이 다르면 경과시간을 비교할 수 없지 않나 싶지만, 마크 반영은 항상 센서 읽기
 * 반영보다 먼저다(syncStepLedger). 재부팅 후 첫 동기화 시점의 스냅샷은 아직 이전
 * 부팅의 것이라 그 부팅의 마크와 정상 비교되고, 스냅샷이 새 부팅으로 갱신될 때는
 * 이전 마크가 이미 소화된 뒤다.
 *
 * 자정과 마크 발화 사이(부정확 알람이라 최대 1시간)에 동기화가 끼면 밤 걸음이 새
 * 날짜로 흡수된 뒤 마크가 여기서 버려진다. 그 밤만 마크 도입 전과 같은 동작으로
 * 돌아갈 뿐(다음 날로 밀림), 걸음이 사라지거나 부풀지는 않는다.
 */
function isAfterSnapshot(
  snapshot: StepCounterSnapshot | null,
  mark: StepBoundaryMark,
): boolean {
  return (
    snapshot === null || mark.elapsedRealtimeMs > snapshot.elapsedRealtimeMs
  );
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
