/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useStepCountingService } from '../src/features/history/hooks/useStepCountingService';

jest.mock('../src/features/auth/model/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

jest.mock('../src/shared/lib/samsungHealth', () => ({
  isSamsungHealthAvailable: jest.fn(),
  hasSamsungHealthPermissions: jest.fn(),
  readSamsungHealthToday: jest.fn(),
}));

jest.mock('../src/shared/lib/stepSensor', () => ({
  isStepSensorAvailable: jest.fn(() => true),
  startStepCounting: jest.fn(async () => {}),
  stopStepCounting: jest.fn(async () => {}),
}));

jest.mock('../src/shared/lib/permissions', () => ({
  checkPermission: jest.fn(async () => true),
}));

const samsungHealth = jest.requireMock('../src/shared/lib/samsungHealth') as {
  isSamsungHealthAvailable: jest.Mock;
  hasSamsungHealthPermissions: jest.Mock;
  readSamsungHealthToday: jest.Mock;
};
const stepSensor = jest.requireMock('../src/shared/lib/stepSensor') as {
  isStepSensorAvailable: jest.Mock;
  startStepCounting: jest.Mock;
  stopStepCounting: jest.Mock;
};
const permissions = jest.requireMock('../src/shared/lib/permissions') as {
  checkPermission: jest.Mock;
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let appStateHandlers: ((status: AppStateStatus) => void)[] = [];

function Host() {
  useStepCountingService();
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  stepSensor.isStepSensorAvailable.mockReturnValue(true);
  permissions.checkPermission.mockResolvedValue(true);

  appStateHandlers = [];
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, handler) => {
      appStateHandlers.push(handler as (status: AppStateStatus) => void);
      return { remove: jest.fn() } as never;
    });
});

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
  queryClient?.clear();
  queryClient = null;
});

/** react-query는 알림을 setTimeout으로 모아 보내서 타이머까지 흘려보내야 한다. */
async function flushQueries() {
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });
}

async function render() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient!}>
        <Host />
      </QueryClientProvider>,
    );
  });
  await flushQueries();
}

/** 삼성헬스가 아예 없는 기기(픽셀, 삼성헬스를 지운 갤럭시). */
function withoutSamsungHealth() {
  samsungHealth.isSamsungHealthAvailable.mockResolvedValue(false);
  samsungHealth.hasSamsungHealthPermissions.mockResolvedValue(false);
}

it('삼성헬스가 없는 기기에서는 걸음 집계 서비스를 띄운다', async () => {
  withoutSamsungHealth();

  await render();

  expect(stepSensor.startStepCounting).toHaveBeenCalled();
  expect(stepSensor.stopStepCounting).not.toHaveBeenCalled();
});

it('삼성헬스 권한을 허용하지 않은 기기에서도 띄운다', async () => {
  samsungHealth.isSamsungHealthAvailable.mockResolvedValue(true);
  samsungHealth.hasSamsungHealthPermissions.mockResolvedValue(false);

  await render();

  expect(stepSensor.startStepCounting).toHaveBeenCalled();
});

it('삼성헬스에서 읽는 기기에서는 띄우지 않고 내린다', async () => {
  samsungHealth.isSamsungHealthAvailable.mockResolvedValue(true);
  samsungHealth.hasSamsungHealthPermissions.mockResolvedValue(true);
  samsungHealth.readSamsungHealthToday.mockResolvedValue({
    steps: 3000,
    distanceMeters: 2100,
    activeCalories: 120,
  });

  await render();

  expect(stepSensor.startStepCounting).not.toHaveBeenCalled();
  expect(stepSensor.stopStepCounting).toHaveBeenCalled();
});

it('화면을 떠나도 서비스를 내리지 않는다 — 앱이 꺼진 동안 세는 것이 존재 이유다', async () => {
  withoutSamsungHealth();
  await render();

  act(() => {
    renderer?.unmount();
  });
  renderer = null;

  expect(stepSensor.stopStepCounting).not.toHaveBeenCalled();
});

it('신체 활동 권한이 없으면 띄우지 않는다 — health 포그라운드 서비스가 거부된다', async () => {
  withoutSamsungHealth();
  permissions.checkPermission.mockResolvedValue(false);

  await render();

  expect(stepSensor.startStepCounting).not.toHaveBeenCalled();
});

it('앱이 다시 앞으로 오면 서비스를 한 번 더 띄운다 — OS가 걷어갔을 수 있다', async () => {
  withoutSamsungHealth();
  await render();
  stepSensor.startStepCounting.mockClear();

  await act(async () => {
    appStateHandlers.forEach(handler => handler('active'));
  });

  expect(stepSensor.startStepCounting).toHaveBeenCalled();
});

it('걸음 센서가 없는 기기에서는 띄우지 않는다', async () => {
  withoutSamsungHealth();
  stepSensor.isStepSensorAvailable.mockReturnValue(false);

  await render();

  expect(stepSensor.startStepCounting).not.toHaveBeenCalled();
});
