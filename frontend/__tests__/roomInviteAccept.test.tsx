/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ReceivedRoomInvite } from '../src/features/room/api/roomApi';
import { useRoomInviteAccept } from '../src/features/room/hooks/useRoomInviteAccept';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import {
  FakeWebSocket,
  installWebSocketMock,
  serverFrame,
} from '../jest/webSocketMock';

const ROOM_ID = 10;
const REQUEST_ID = 20;

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;
let restoreWebSocket: () => void;
let acceptedUrls: string[] = [];

function buildInvite(
  overrides: Partial<ReceivedRoomInvite> = {},
): ReceivedRoomInvite {
  return {
    requestId: REQUEST_ID,
    roomId: ROOM_ID,
    inviterId: 1,
    inviterNickname: '민서',
    status: 'PENDING',
    createdAt: '2026-08-05T00:00:00',
    ...overrides,
  };
}

let accept: ((invite: ReceivedRoomInvite) => Promise<unknown>) | null = null;
const onBattleStarted = jest.fn();

function Probe({ enabled }: { enabled: boolean }) {
  const { acceptInvite } = useRoomInviteAccept({
    enabled,
    onBattleStarted,
  });
  accept = acceptInvite;
  return null;
}

function render(enabled: boolean) {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  act(() => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient!}>
        <Probe enabled={enabled} />
      </QueryClientProvider>,
    );
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  acceptedUrls = [];
  accept = null;
  onBattleStarted.mockClear();
  restoreWebSocket = installWebSocketMock();
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    acceptedUrls.push(url);
    return jsonResponse(200, {});
  });
});

afterEach(() => {
  if (renderer) {
    act(() => renderer?.unmount());
    renderer = null;
  }
  queryClient?.clear();
  queryClient = null;
  restoreWebSocket();
  jest.useRealTimers();
});

describe('받은 초대 수락', () => {
  test('소켓 핸드셰이크가 안 끝나도 수락은 즉시 나간다', async () => {
    // 수락 뒤에는 카운트다운 유예로 소켓이 열릴 수 있지만(모드를 모르므로),
    // 그 소켓이 수락 요청을 막아서는 안 된다.
    render(false);

    await act(async () => {
      await accept!(buildInvite());
    });

    expect(acceptedUrls[0]).toContain(
      `/rooms/${ROOM_ID}/requests/${REQUEST_ID}/accept`,
    );
  });

  test('소켓이 안 붙어도 대결 수락이 나간다', async () => {
    // 이 회귀가 실제로 났다. 구독 완료를 무한정 기다리게 두면 서버가 CONNECT에
    // 응답하지 않는 환경에서 수락 요청 자체가 영영 안 나간다.
    render(true);

    const pending = act(async () => {
      await accept!(buildInvite({ mode: 'BATTLE' }));
    });
    // 핸드셰이크를 일부러 완성하지 않는다. 상한만 흘려보낸다.
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    await pending;

    expect(acceptedUrls.some(url => url.includes('/accept'))).toBe(true);
  });

  test('대결 초대가 없으면 소켓을 열지 않는다', () => {
    render(false);

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  test('수락 직후 초대 목록이 비어도 카운트다운을 받는다', async () => {
    // 실기기에서 났던 회귀다. 수락 응답이 오면 초대 목록이 갱신돼 enabled가
    // 꺼지는데, 그 순간 구독을 접으면 곧바로 도착하는 카운트다운이 사라진다.
    render(true);
    const socket = FakeWebSocket.last;
    act(() => {
      socket.open();
      socket.emit(serverFrame('CONNECTED', { version: '1.2' }));
    });

    await act(async () => {
      await accept!(buildInvite({ mode: 'BATTLE' }));
    });

    // 초대 목록 갱신으로 구독 조건이 꺼진 상황.
    act(() => {
      renderer!.update(
        <QueryClientProvider client={queryClient!}>
          <Probe enabled={false} />
        </QueryClientProvider>,
      );
    });
    // 유예 덕에 구독이 살아 있어야 한다 — 소켓이 닫히지 않았다.
    expect(socket.closeCallCount).toBe(0);

    const frame = socket.sentFrames('SUBSCRIBE')[0] ?? '';
    const subscriptionId = /(?:^|\n)id:(.*)\n/.exec(frame)?.[1] ?? '';
    act(() => {
      socket.emit(
        serverFrame(
          'MESSAGE',
          { subscription: subscriptionId, destination: '/user/queue/battle' },
          JSON.stringify({
            type: 'BATTLE_COUNTDOWN_STARTED',
            roomId: ROOM_ID,
            requestId: REQUEST_ID,
            hostId: 1,
            inviteeId: 2,
            countdownSeconds: 3,
          }),
        ),
      );
    });

    expect(onBattleStarted).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'BATTLE_COUNTDOWN_STARTED' }),
    );
  });
});
