/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { WALK_SESSION_GUIDE_QUERY_KEY } from '../src/shared/api/deviceQueries';
import { isDeviceQuery } from '../src/shared/api/deviceQueries';
import { useWalkSessionGuideStatus } from '../src/shared/hooks/useWalkSessionGuideStatus';
import {
  getWalkSessionGuideSeen,
  setWalkSessionGuideSeen,
} from '../src/shared/lib/walkSessionGuideStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;

/** 훅이 내놓은 마지막 값. 렌더 밖에서 읽으려고 받아 둔다. */
let status: ReturnType<typeof useWalkSessionGuideStatus> | null = null;

function Probe() {
  status = useWalkSessionGuideStatus();
  return null;
}

/** react-query는 알림을 setTimeout으로 모아 보내서 타이머까지 흘려보내야 한다. */
async function flushQueries() {
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });
}

async function renderProbe() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient as QueryClient}>
        <Probe />
      </QueryClientProvider>,
    );
  });

  await flushQueries();
}

beforeEach(async () => {
  // 목 저장소는 모듈이 이미 붙잡은 인스턴스라, 레지스트리를 비우는 것으로는
  // 앞 테스트가 남긴 값이 지워지지 않는다. 인스턴스를 직접 비운다.
  await AsyncStorage.clear();
  status = null;
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

describe('walkSessionGuideStorage', () => {
  it('처음 온 기기는 안내를 아직 못 본 것으로 본다', async () => {
    await expect(getWalkSessionGuideSeen()).resolves.toBe(false);
  });

  it('봤다고 저장하면 다음 조회에서 그대로 읽힌다', async () => {
    await setWalkSessionGuideSeen();

    await expect(getWalkSessionGuideSeen()).resolves.toBe(true);
  });
});

describe('useWalkSessionGuideStatus', () => {
  it('첫 산책이면 안내를 보여줄 상태로 답한다', async () => {
    await renderProbe();

    expect(status?.isLoading).toBe(false);
    expect(status?.hasSeen).toBe(false);
  });

  it('봤다고 표시하면 곧바로 반영하고 기기에 남긴다', async () => {
    await renderProbe();

    await act(async () => {
      await status?.markSeen();
    });
    await flushQueries();

    expect(status?.hasSeen).toBe(true);
    // 앱을 다시 켜도 안내가 뜨지 않아야 한다.
    await expect(getWalkSessionGuideSeen()).resolves.toBe(true);
  });

  it('이미 본 기기에서는 안내를 다시 띄우지 않는다', async () => {
    await setWalkSessionGuideSeen();

    await renderProbe();

    expect(status?.hasSeen).toBe(true);
  });

  it('로그아웃해도 지워지지 않는 기기 상태로 등록돼 있다', async () => {
    // 계정 캐시와 함께 지워지면 다른 계정으로 로그인할 때마다 안내가 다시 뜬다.
    expect(isDeviceQuery(WALK_SESSION_GUIDE_QUERY_KEY)).toBe(true);
  });
});
