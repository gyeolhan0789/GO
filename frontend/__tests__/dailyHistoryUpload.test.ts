/**
 * @format
 */

import { uploadPendingDailyHistories } from '../src/features/history/model/dailyHistoryUpload';
import { EMPTY_STEP_LEDGER, type StepLedger } from '../src/shared/lib/stepLedger';
import {
  readStepLedger,
  saveStepLedger,
} from '../src/shared/lib/stepLedgerStorage';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

const YESTERDAY = '2026-08-05';
const TWO_DAYS_AGO = '2026-08-04';
const TODAY = new Date(2026, 7, 6);

// 성별별 보폭·걸음당 칼로리(stepEstimate.ts)와 같은 값. 남성 3000걸음 기준.
const MALE_DISTANCE_PER_3000 = Math.round(3000 * 0.78);
const MALE_CALORIES_PER_3000 = Math.round(3000 * 0.04);

const MY_PAGE = {
  id: 1,
  email: 'walker@example.com',
  nickname: '걷는곰',
  gender: 'MALE',
  region: 'SEOUL',
};

let fetchMock: FetchMock;

function savedHistoryBodies() {
  return fetchMock.mock.calls
    .filter(([url, init]) => url.includes('/histories') && init?.method === 'POST')
    .map(([, init]) => JSON.parse(String(init?.body)));
}

async function seedLedger(days: StepLedger['days']) {
  await saveStepLedger({ ...EMPTY_STEP_LEDGER, days });
}

beforeAll(() => {
  // '오늘'을 고정해야 어느 날짜가 전송 대기인지 기대값을 적을 수 있다.
  jest.useFakeTimers({ now: TODAY, doNotFake: ['nextTick', 'setImmediate'] });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(async () => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async (url, init) => {
    if (url.includes('/members/me')) {
      return jsonResponse(200, MY_PAGE);
    }
    if (url.includes('/histories') && init?.method === 'POST') {
      return jsonResponse(201);
    }
    throw new Error(`예상하지 못한 요청: ${url}`);
  });
  await saveStepLedger(EMPTY_STEP_LEDGER);
});

describe('일일 활동 기록 전송', () => {
  test('하루가 끝난 날짜의 걸음을 거리·칼로리로 환산해 올린다', async () => {
    await seedLedger([{ date: YESTERDAY, steps: 3000, reportedSteps: 0 }]);

    expect(await uploadPendingDailyHistories()).toBe(1);
    expect(savedHistoryBodies()).toEqual([
      {
        historyDate: YESTERDAY,
        step: 3000,
        distance: MALE_DISTANCE_PER_3000,
        calories: MALE_CALORIES_PER_3000,
      },
    ]);
  });

  test('산책으로 이미 서버에 올라간 몫은 빼고 보낸다', async () => {
    // POST /histories가 누적이라, 산책 완료로 서버가 더한 1200걸음을 또 보내면
    // 그날 기록이 두 배가 된다.
    await seedLedger([{ date: YESTERDAY, steps: 3000, reportedSteps: 1200 }]);

    await uploadPendingDailyHistories();

    expect(savedHistoryBodies()).toEqual([
      expect.objectContaining({ historyDate: YESTERDAY, step: 1800 }),
    ]);
  });

  test('올린 뒤에는 다시 올리지 않는다', async () => {
    await seedLedger([{ date: YESTERDAY, steps: 3000, reportedSteps: 0 }]);

    await uploadPendingDailyHistories();
    expect(await uploadPendingDailyHistories()).toBe(0);

    expect(savedHistoryBodies()).toHaveLength(1);
  });

  test('오늘 몫은 하루가 끝나기 전이라 올리지 않는다', async () => {
    await seedLedger([{ date: '2026-08-06', steps: 500, reportedSteps: 0 }]);

    expect(await uploadPendingDailyHistories()).toBe(0);
    expect(savedHistoryBodies()).toEqual([]);
  });

  test('밀린 날짜가 여러 개면 오래된 순으로 모두 올린다', async () => {
    await seedLedger([
      { date: TWO_DAYS_AGO, steps: 1000, reportedSteps: 0 },
      { date: YESTERDAY, steps: 2000, reportedSteps: 0 },
    ]);

    expect(await uploadPendingDailyHistories()).toBe(2);
    expect(savedHistoryBodies().map(body => body.historyDate)).toEqual([
      TWO_DAYS_AGO,
      YESTERDAY,
    ]);
  });

  test('한 날짜가 실패해도 나머지는 올리고, 실패한 날은 대기로 남는다', async () => {
    await seedLedger([
      { date: TWO_DAYS_AGO, steps: 1000, reportedSteps: 0 },
      { date: YESTERDAY, steps: 2000, reportedSteps: 0 },
    ]);
    fetchMock.mockImplementation(async (url, init) => {
      if (url.includes('/members/me')) {
        return jsonResponse(200, MY_PAGE);
      }
      const body = JSON.parse(String(init?.body));
      return body.historyDate === TWO_DAYS_AGO
        ? jsonResponse(500, { message: '서버 오류' })
        : jsonResponse(201);
    });

    expect(await uploadPendingDailyHistories()).toBe(1);

    const ledger = await readStepLedger();
    // 실패한 날은 반영되지 않아 다음 기회에 다시 시도된다.
    expect(ledger.days).toEqual([
      { date: TWO_DAYS_AGO, steps: 1000, reportedSteps: 0 },
      { date: YESTERDAY, steps: 2000, reportedSteps: 2000 },
    ]);
  });

  test('올릴 게 없으면 회원 정보도 부르지 않는다', async () => {
    expect(await uploadPendingDailyHistories()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
