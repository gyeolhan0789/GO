import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_STEP_LEDGER, type StepLedger } from './stepLedger';

const STEP_LEDGER_KEY = 'steps.ledger';

function isStepLedger(value: unknown): value is StepLedger {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<StepLedger>;

  return Array.isArray(candidate.days) && 'snapshot' in candidate;
}

/**
 * 저장된 걸음 원장을 읽는다. 없거나 깨졌으면 빈 원장으로 시작한다.
 *
 * 깨진 값을 그대로 쓰면 걸음 집계가 통째로 어긋나고, 원장은 센서를 다시 읽으면 이어서
 * 쌓이므로 버리는 편이 안전하다(잃는 건 아직 안 올린 며칠분 걸음뿐이다).
 */
export async function readStepLedger(): Promise<StepLedger> {
  try {
    const stored = await AsyncStorage.getItem(STEP_LEDGER_KEY);
    if (stored === null) {
      return EMPTY_STEP_LEDGER;
    }
    const parsed: unknown = JSON.parse(stored);

    return isStepLedger(parsed) ? parsed : EMPTY_STEP_LEDGER;
  } catch {
    return EMPTY_STEP_LEDGER;
  }
}

/**
 * 걸음 원장을 저장한다.
 *
 * 실패를 삼키지 않고 던진다. 저장하지 못하면 다음 실행이 옛 기준점으로 증가분을 세서
 * 걸음이 중복 집계되므로, 호출부가 알고 재시도해야 하는 실패다.
 */
export async function saveStepLedger(ledger: StepLedger): Promise<void> {
  await AsyncStorage.setItem(STEP_LEDGER_KEY, JSON.stringify(ledger));
}
