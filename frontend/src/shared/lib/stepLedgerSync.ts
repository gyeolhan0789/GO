import { todayIso } from './isoDate';
import {
  applyStepReading,
  markStepsReported,
  type StepLedger,
} from './stepLedger';
import { readStepLedger, saveStepLedger } from './stepLedgerStorage';
import { readStepCounter } from './stepSensor';

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

  const ledger = applyStepReading(await readStepLedger(), reading, todayIso());
  await saveStepLedger(ledger);

  return ledger;
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
  await saveStepLedger(markStepsReported(await readStepLedger(), date, steps));
}
