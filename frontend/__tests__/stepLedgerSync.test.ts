/**
 * @format
 */

import {
  reportStepsToLedger,
  syncStepLedger,
} from '../src/shared/lib/stepLedgerSync';
import { EMPTY_STEP_LEDGER, stepsOn } from '../src/shared/lib/stepLedger';
import {
  readStepLedger,
  saveStepLedger,
} from '../src/shared/lib/stepLedgerStorage';
import { toIsoDate } from '../src/shared/lib/isoDate';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('../src/shared/lib/stepSensor', () => ({
  readStepCounter: jest.fn(),
}));

const { readStepCounter } = jest.requireMock(
  '../src/shared/lib/stepSensor',
) as { readStepCounter: jest.Mock };

const TODAY = toIsoDate(new Date());

beforeEach(async () => {
  jest.clearAllMocks();
  await saveStepLedger(EMPTY_STEP_LEDGER);
});

it('센서 읽기가 원장에 증가분으로 쌓인다', async () => {
  readStepCounter.mockResolvedValue({ steps: 1000, elapsedRealtimeMs: 1_000 });
  await syncStepLedger();

  readStepCounter.mockResolvedValue({ steps: 1060, elapsedRealtimeMs: 2_000 });
  const ledger = await syncStepLedger();

  expect(ledger).not.toBeNull();
  expect(stepsOn(ledger!, TODAY)).toBe(60);
});

it('원장 갱신과 서버 반영 기록이 겹쳐도 서로를 덮지 않는다', async () => {
  // 산책 종료 직후: 20초 폴링(syncStepLedger)과 완료 반영(reportStepsToLedger)이
  // 같은 원장을 두고 동시에 읽고-고쳐-쓴다. 직렬화가 없으면 나중에 저장한 쪽이
  // 먼저 저장한 쪽을 덮어 reportedSteps가 사라지고, 그 걸음은 서버에 두 번 올라간다.
  readStepCounter.mockResolvedValue({ steps: 500, elapsedRealtimeMs: 1_000 });
  await syncStepLedger();
  readStepCounter.mockResolvedValue({ steps: 800, elapsedRealtimeMs: 2_000 });

  await Promise.all([syncStepLedger(), reportStepsToLedger(TODAY, 300)]);

  const ledger = await readStepLedger();
  const today = ledger.days.find(day => day.date === TODAY);
  expect(today?.steps).toBe(300);
  expect(today?.reportedSteps).toBe(300);
});
