import { todayIso } from './isoDate';
import {
  applyStepReading,
  markStepsReported,
  type StepLedger,
} from './stepLedger';
import { readStepLedger, saveStepLedger } from './stepLedgerStorage';
import { readStepCounter } from './stepSensor';

/**
 * 원장 변경(읽고-고쳐-쓰기)을 한 줄로 세운다.
 *
 * syncStepLedger(20초 폴링·포그라운드 전환)와 reportStepsToLedger(산책 완료·일일 기록
 * 전송)가 겹치면 한쪽 변경이 다른 쪽 저장에 덮인다. snapshot·steps는 다음 센서 읽기가
 * 스스로 메꾸지만, reportedSteps는 잃어버리면 되찾을 길이 없어 같은 걸음이 서버에 한 번
 * 더 올라간다 — 겹치는 시점도 하필 "산책 종료 직후"로 정해져 있다.
 */
let ledgerQueue: Promise<unknown> = Promise.resolve();

function enqueueLedgerWrite<T>(task: () => Promise<T>): Promise<T> {
  const result = ledgerQueue.then(task);
  // 실패해도 줄은 계속 서야 한다. 결과(성공/실패)는 호출부가 result로 받는다.
  ledgerQueue = result.catch(() => undefined);
  return result;
}

/**
 * 센서를 한 번 읽어 걸음 원장을 갱신하고 저장한다. 센서가 없거나 못 읽으면 null이다.
 *
 * 앱이 앞으로 올 때마다 부르면 된다 — 자주 불러도 원장은 증가분만 더하므로 중복되지
 * 않고, 오히려 자주 읽을수록 자정·재부팅 경계의 오차가 줄어든다.
 */
export async function syncStepLedger(): Promise<StepLedger | null> {
  const reading = await readStepCounter();
  if (reading === null) {
    return null;
  }

  return enqueueLedgerWrite(async () => {
    const ledger = applyStepReading(
      await readStepLedger(),
      reading,
      todayIso(),
    );
    await saveStepLedger(ledger);

    return ledger;
  });
}

/**
 * 그 날짜로 서버에 반영된 걸음을 원장에 적어둔다.
 *
 * 산책을 마치면 서버가 완료 처리 안에서 그날 걸음 합계에 더한다. 그 몫을 여기 적어두지
 * 않으면 일일 기록 전송이 같은 걸음을 한 번 더 올려 그날 기록이 두 배가 된다.
 */
export async function reportStepsToLedger(
  date: string,
  steps: number,
): Promise<void> {
  await enqueueLedgerWrite(async () =>
    saveStepLedger(markStepsReported(await readStepLedger(), date, steps)),
  );
}
