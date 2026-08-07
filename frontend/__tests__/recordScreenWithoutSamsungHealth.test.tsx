/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RecordScreen } from '../src/screens/RecordScreen/RecordScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import { EMPTY_STEP_LEDGER } from '../src/shared/lib/stepLedger';
import { saveStepLedger } from '../src/shared/lib/stepLedgerStorage';

// 삼성헬스가 없는 기기. 걸음 기록은 서버(GET /histories)에서 읽어야 한다.
jest.mock('../src/shared/lib/samsungHealth', () => ({
  isSamsungHealthAvailable: async () => false,
  hasSamsungHealthPermissions: async () => false,
  readSamsungHealthDailySummaries: async () => {
    throw new Error('삼성헬스가 없는 기기에서는 부르면 안 된다');
  },
  readSamsungHealthHourlySteps: async () => {
    throw new Error('삼성헬스가 없는 기기에서는 부르면 안 된다');
  },
}));

// 걸음 센서는 있는 기기로 둔다. 오늘 몫을 원장에서 채우는 경로를 보려면 필요하다.
jest.mock('../src/shared/lib/stepSensor', () => ({
  isStepSensorAvailable: () => true,
  readStepCounter: jest.fn(),
  readStepBoundaryMarks: jest.fn(async () => []),
}));

jest.mock('../src/shared/lib/permissions', () => ({
  checkPermission: async () => true,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const { readStepCounter } = jest.requireMock(
  '../src/shared/lib/stepSensor',
) as { readStepCounter: jest.Mock };

/** 2026-08-06 (목). 이 주는 월요일이 8월 3일이다. */
const TODAY = new Date(2026, 7, 6);
const TODAY_ISO = '2026-08-06';
const MONDAY_ISO = '2026-08-03';

const SERVER_WEEK_STEPS = 4000;
const TODAY_LEDGER_STEPS = 1500;

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** 서버는 구간의 모든 날짜를 빠짐없이 채워 준다(월~일). 오늘 몫은 아직 비어 있다. */
function buildServerWeek() {
  const histories = Array.from({ length: 7 }, (_, index) => ({
    historyDate: `2026-08-${String(3 + index).padStart(2, '0')}`,
    step: index === 0 ? SERVER_WEEK_STEPS : 0,
    distance: index === 0 ? 3120 : 0,
    calories: index === 0 ? 160 : 0,
  }));

  return {
    period: 'WEEK',
    startDate: MONDAY_ISO,
    endDate: '2026-08-09',
    totalStep: SERVER_WEEK_STEPS,
    totalDistance: 3120,
    totalCalories: 160,
    histories,
  };
}

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

beforeAll(() => {
  jest.useFakeTimers({
    now: TODAY,
    doNotFake: [
      'cancelAnimationFrame',
      'cancelIdleCallback',
      'clearImmediate',
      'clearInterval',
      'clearTimeout',
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'requestIdleCallback',
      'setImmediate',
      'setInterval',
      'setTimeout',
    ],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(async () => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes('/histories')) {
      return jsonResponse(200, buildServerWeek());
    }
    if (url.includes('/walk-sessions')) {
      return jsonResponse(200, { content: [], hasNext: false });
    }
    throw new Error(`예상하지 못한 요청: ${url}`);
  });

  // 오늘 1500걸음이 쌓인 원장. 두 번째 읽기부터 증가분이 잡히므로 두 번 읽힌 상태로 둔다.
  await saveStepLedger({
    snapshot: { steps: 8500, elapsedRealtimeMs: 120_000, date: TODAY_ISO },
    days: [{ date: TODAY_ISO, steps: TODAY_LEDGER_STEPS, reportedSteps: 0 }],
  });
  readStepCounter.mockResolvedValue({
    steps: 8500,
    elapsedRealtimeMs: 180_000,
  });
});

afterEach(async () => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
  // 안 비우면 react-query gc 타이머가 살아남아 워커가 안 죽는다.
  queryClient?.clear();
  queryClient = null;
  await saveStepLedger(EMPTY_STEP_LEDGER);
});

/** react-query는 알림을 setTimeout으로 모아 보내서 타이머까지 흘려보내야 한다. */
async function flushQueries() {
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });
}

function collectTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    .filter((child): child is string => typeof child === 'string');
}

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient = client;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <RecordScreen />
        </SafeAreaProvider>
      </QueryClientProvider>,
    );
  });

  await flushQueries();
  await flushQueries();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

describe('삼성헬스가 없는 기기의 기록 화면', () => {
  test('서버에 쌓인 일일 기록으로 구간 합계를 보여준다', async () => {
    const tree = await renderScreen();

    expect(
      fetchMock.mock.calls.some(([url]) =>
        url.includes('/histories?period=WEEK'),
      ),
    ).toBe(true);
    // 삼성헬스 경로였다면 '삼성헬스를 사용할 수 없는 기기예요' 문구만 떴다.
    expect(collectTexts(tree.root)).not.toContain(
      '삼성헬스를 사용할 수 없는 기기예요. 갤럭시에서 확인해주세요.',
    );
  });

  test('아직 서버에 안 올라간 오늘 걸음을 기기 값으로 채워 합계에 넣는다', async () => {
    const tree = await renderScreen();

    // 일일 기록 전송은 하루가 끝난 뒤라, 서버의 오늘 행은 비어 있다. 그대로 그리면
    // 오늘 걸은 게 그래프에서 사라진다.
    const total = SERVER_WEEK_STEPS + TODAY_LEDGER_STEPS;
    expect(collectTexts(tree.root)).toContain(total.toLocaleString('en-US'));
  });

  test('시간대별 데이터를 얻을 수 없어 일간 구간을 선택지에서 뺀다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('주간');
    expect(texts).not.toContain('일간');
  });
});
