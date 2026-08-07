/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CHARACTER_QUERY_KEY } from '../src/features/member/hooks/useMyCharacterQuery';
import { useSaveEquippedItemsMutation } from '../src/features/member/hooks/useSaveEquippedItemsMutation';
import { useUpdateProfileMutation } from '../src/features/member/hooks/useUpdateProfileMutation';
import { RANKING_QUERY_KEY } from '../src/features/ranking/hooks/useRankingQuery';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

/**
 * 내 아바타는 회원 조회 말고도 랭킹·방 응답에 스냅샷으로 실려 온다. 그 캐시가
 * 무효화되지 않으면 옷을 갈아입어도 랭킹 줄과 방 멤버 목록은 옛 옷차림으로 남는다.
 */
const RANKING_KEY = [...RANKING_QUERY_KEY, 'FRIENDS'];
const ROOM_DETAIL_KEY = ['rooms', 12];
const MY_ROOMS_KEY = ['rooms', 'mine', 'COOPERATE'];

// 아바타와 무관한 캐시. 옷을 갈아입었다고 같이 버려지면 안 된다.
const HISTORIES_KEY = ['histories', 'WEEK', '2026-08-06'];

let fetchMock: FetchMock;
let queryClient: QueryClient;
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

let saveEquippedItems: ((memberItemIds: number[]) => void) | null = null;
let updateProfile: ((nickname: string) => void) | null = null;

function Probe() {
  const save = useSaveEquippedItemsMutation();
  const update = useUpdateProfileMutation();

  saveEquippedItems = save.mutate;
  updateProfile = nickname => update.mutate({ nickname });

  return null;
}

/** 무효화 대상을 판별할 수 있게, 아바타를 싣고 오는 캐시를 미리 채워 둔다. */
function seedCaches() {
  for (const key of [
    CHARACTER_QUERY_KEY,
    RANKING_KEY,
    ROOM_DETAIL_KEY,
    MY_ROOMS_KEY,
    HISTORIES_KEY,
  ]) {
    queryClient.setQueryData(key, {});
  }
}

function isInvalidated(key: unknown[]) {
  return queryClient.getQueryState(key)?.isInvalidated;
}

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockResolvedValue(jsonResponse(200));
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  seedCaches();

  act(() => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    );
  });
});

afterEach(() => {
  if (renderer) {
    act(() => renderer?.unmount());
    renderer = null;
  }
  saveEquippedItems = null;
  updateProfile = null;
  queryClient.clear();
});

describe('useSaveEquippedItemsMutation', () => {
  test('옷을 갈아입으면 아바타를 싣고 오는 캐시를 모두 무효화한다', async () => {
    await act(async () => {
      saveEquippedItems?.([1, 2]);
    });

    expect(isInvalidated(CHARACTER_QUERY_KEY)).toBe(true);
    expect(isInvalidated(RANKING_KEY)).toBe(true);
    expect(isInvalidated(ROOM_DETAIL_KEY)).toBe(true);
    expect(isInvalidated(MY_ROOMS_KEY)).toBe(true);
  });

  test('아바타와 무관한 캐시는 남겨둔다', async () => {
    await act(async () => {
      saveEquippedItems?.([1, 2]);
    });

    expect(isInvalidated(HISTORIES_KEY)).toBe(false);
  });

  test('저장이 실패하면 캐시를 버리지 않는다', async () => {
    // 서버가 거절했으면 화면에 보이는 옷차림이 아직 맞다. 다시 읽어봐야 같은 값이다.
    fetchMock.mockResolvedValue(jsonResponse(500, { message: '실패' }));

    await act(async () => {
      saveEquippedItems?.([1, 2]);
    });

    expect(isInvalidated(CHARACTER_QUERY_KEY)).toBe(false);
    expect(isInvalidated(RANKING_KEY)).toBe(false);
    expect(isInvalidated(ROOM_DETAIL_KEY)).toBe(false);
  });
});

describe('useUpdateProfileMutation', () => {
  test('닉네임·성별을 바꾸면 랭킹과 방 캐시도 무효화한다', async () => {
    // 랭킹 줄과 방 멤버 목록은 닉네임과 성별(기본 캐릭터 이미지)도 스냅샷으로 들고 있다.
    await act(async () => {
      updateProfile?.('새 닉네임');
    });

    expect(isInvalidated(CHARACTER_QUERY_KEY)).toBe(true);
    expect(isInvalidated(RANKING_KEY)).toBe(true);
    expect(isInvalidated(ROOM_DETAIL_KEY)).toBe(true);
    expect(isInvalidated(MY_ROOMS_KEY)).toBe(true);
  });
});
