/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useBattleRematch } from '../src/features/room/hooks/useBattleRematch';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import {
  FakeWebSocket,
  installWebSocketMock,
  serverFrame,
} from '../jest/webSocketMock';

const ROOM_ID = 10;
const ME = 1;
const OPPONENT = 2;
const TOPIC = `/topic/rooms/${ROOM_ID}/rematch`;

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;
let restoreWebSocket: () => void;
let requestedUrls: string[] = [];

const onRematchStarted = jest.fn();
type Api = ReturnType<typeof useBattleRematch>;
let api: Api | null = null;

function Probe({ isHost }: { isHost: boolean }) {
  api = useBattleRematch({
    roomId: ROOM_ID,
    myMemberId: ME,
    isHost,
    enabled: true,
    onRematchStarted,
  });
  return null;
}

function render(isHost: boolean) {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  act(() => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient!}>
        <Probe isHost={isHost} />
      </QueryClientProvider>,
    );
  });
}

/** 소켓을 열고 CONNECTED까지 받아 구독이 붙은 상태로 만든다. */
function completeHandshake() {
  const socket = FakeWebSocket.last;
  act(() => {
    socket.open();
    socket.emit(serverFrame('CONNECTED', { version: '1.2' }));
  });
  return socket;
}

function subscriptionIdOf(socket: FakeWebSocket): string {
  const frame = socket.sentFrames('SUBSCRIBE')[0] ?? '';
  return /(?:^|\n)id:(.*)\n/.exec(frame)?.[1] ?? '';
}

/** 상대가 보낸 것처럼 브로커가 되돌려준 메시지. */
function emitFromOpponent(
  socket: FakeWebSocket,
  type: 'OFFER' | 'ACCEPT' | 'DECLINE',
  fromMemberId = OPPONENT,
) {
  act(() => {
    socket.emit(
      serverFrame(
        'MESSAGE',
        { subscription: subscriptionIdOf(socket), destination: TOPIC },
        JSON.stringify({ type, roomId: ROOM_ID, fromMemberId }),
      ),
    );
  });
}

function sentBodies(socket: FakeWebSocket): string[] {
  return socket.sentFrames('SEND');
}

beforeEach(() => {
  jest.useFakeTimers();
  requestedUrls = [];
  api = null;
  onRematchStarted.mockClear();
  restoreWebSocket = installWebSocketMock();
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    requestedUrls.push(url);
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

describe('재대결 제안·수락', () => {
  test('방장이 신청하면 제안만 보내고 판은 아직 만들지 않는다', () => {
    render(true);
    const socket = completeHandshake();

    act(() => api!.offerRematch());

    expect(sentBodies(socket)[0]).toContain('"type":"OFFER"');
    // 상대가 받아들이기 전에 판을 만들면 상대가 모르는 채 시작된다.
    expect(requestedUrls.filter(url => url.includes('rematch'))).toHaveLength(0);
  });

  test('상대의 수락을 받은 방장이 그때 판을 만든다', async () => {
    render(true);
    const socket = completeHandshake();
    act(() => api!.offerRematch());

    emitFromOpponent(socket, 'ACCEPT');
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      requestedUrls.some(url =>
        url.includes(`/rooms/${ROOM_ID}/battles/rematch`),
      ),
    ).toBe(true);
    expect(onRematchStarted).toHaveBeenCalled();
  });

  test('상대는 제안을 받으면 수락 버튼 상태가 된다', () => {
    render(false);
    const socket = completeHandshake();

    emitFromOpponent(socket, 'OFFER');

    expect(api!.hasIncomingOffer).toBe(true);
  });

  test('상대가 수락하면 ACCEPT를 보내고 판은 직접 만들지 않는다', () => {
    render(false);
    const socket = completeHandshake();
    emitFromOpponent(socket, 'OFFER');

    act(() => api!.acceptRematch());

    expect(sentBodies(socket).some(f => f.includes('"type":"ACCEPT"'))).toBe(
      true,
    );
    // 방장만 부를 수 있는 API라 상대가 부르면 403이다.
    expect(requestedUrls.filter(url => url.includes('rematch'))).toHaveLength(0);
  });

  test('거절을 받으면 방장의 대기 상태가 풀린다', () => {
    render(true);
    const socket = completeHandshake();
    act(() => api!.offerRematch());
    expect(api!.isOffering).toBe(true);

    emitFromOpponent(socket, 'DECLINE');

    expect(api!.isOffering).toBe(false);
  });

  test('내가 보낸 메시지가 되돌아와도 무시한다', () => {
    // 브로커는 보낸 사람에게도 중계한다. 내 OFFER를 내가 받으면 안 된다.
    render(true);
    const socket = completeHandshake();

    emitFromOpponent(socket, 'OFFER', ME);

    expect(api!.hasIncomingOffer).toBe(false);
  });

  test('상대가 응답하지 않으면 제안이 만료된다', () => {
    render(true);
    const socket = completeHandshake();
    act(() => api!.offerRematch());
    expect(api!.isOffering).toBe(true);

    // 상대가 앱을 껐을 수 있다 — 하염없이 기다리지 않는다.
    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(api!.isOffering).toBe(false);
    expect(socket.hasSent('SEND')).toBe(true);
  });

  test('받은 제안도 만료된다', () => {
    render(false);
    const socket = completeHandshake();
    emitFromOpponent(socket, 'OFFER');
    expect(api!.hasIncomingOffer).toBe(true);

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(api!.hasIncomingOffer).toBe(false);
  });
});
