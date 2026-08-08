/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { BingoBoardResponse } from '../src/features/bingo/api/bingoApi';
import { useBattleProgressSubscription } from '../src/features/bingo/hooks/useBattleProgressSubscription';
import {
  FakeWebSocket,
  installWebSocketMock,
  serverFrame,
} from '../jest/webSocketMock';

const ROOM_ID = 7;
const TOPIC = `/topic/rooms/${ROOM_ID}/battle-progress`;
const BOARD_KEY = ['bingoBoards', 'active', ROOM_ID];

let restoreWebSocket: () => void;
let queryClient: QueryClient;
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

function buildBoard(): BingoBoardResponse {
  return {
    bingoBoardId: 100,
    roomId: ROOM_ID,
    boardSize: 3,
    targetStepCount: null,
    completedBingoCount: 0,
    totalCellCount: 9,
    approvedCellCount: 0,
    cells: [],
    completed: false,
    canRenew: false,
    renewalRequired: false,
    renewalMessage: null,
    battleProgress: {
      roomStatus: 'ACTIVE',
      gameStatus: 'ACTIVE',
      me: {
        memberId: 1,
        bingoBoardId: 100,
        totalCellCount: 9,
        approvedCellCount: 0,
        completedBingoCount: 0,
        targetReached: false,
      },
      opponent: {
        memberId: 2,
        bingoBoardId: 200,
        totalCellCount: 9,
        approvedCellCount: 0,
        completedBingoCount: 0,
        targetReached: false,
      },
      result: null,
    },
  };
}

function Probe({ enabled }: { enabled: boolean }) {
  useBattleProgressSubscription(ROOM_ID, enabled);
  return null;
}

function render(enabled = true) {
  act(() => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={queryClient}>
        <Probe enabled={enabled} />
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

/**
 * 클라이언트가 실제로 보낸 SUBSCRIBE의 id. 구독 id는 모듈 전역 카운터라
 * 테스트마다 값이 달라져서, 고정값을 쓰면 메시지가 아무에게도 안 간다.
 */
function subscriptionIdOf(socket: FakeWebSocket): string {
  const frame = socket.sentFrames('SUBSCRIBE')[0] ?? '';
  return /(?:^|\n)id:(.*)\n/.exec(frame)?.[1] ?? '';
}

/** 서버가 진행률 이벤트를 쏜 것처럼 만든다. */
function emitProgress(socket: FakeWebSocket, event: Record<string, unknown>) {
  act(() => {
    socket.emit(
      serverFrame(
        'MESSAGE',
        { subscription: subscriptionIdOf(socket), destination: TOPIC },
        JSON.stringify(event),
      ),
    );
  });
}

function readProgress() {
  return queryClient.getQueryData<BingoBoardResponse>(BOARD_KEY)
    ?.battleProgress;
}

beforeEach(() => {
  restoreWebSocket = installWebSocketMock();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(BOARD_KEY, buildBoard());
});

afterEach(() => {
  if (renderer) {
    act(() => renderer?.unmount());
    renderer = null;
  }
  queryClient.clear();
  restoreWebSocket();
});

describe('useBattleProgressSubscription', () => {
  test('대결방이면 진행률 토픽을 구독한다', () => {
    render();
    const socket = completeHandshake();

    expect(socket.sentFrames('SUBSCRIBE')[0]).toContain(`destination:${TOPIC}`);
  });

  test('대결방이 아니면 소켓을 열지 않는다', () => {
    render(false);

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  test('상대 진행률을 캐시에 얹는다', () => {
    render();
    const socket = completeHandshake();

    emitProgress(socket, {
      roomId: ROOM_ID,
      gameId: 5,
      participantMemberId: 2,
      bingoBoardId: 200,
      approvedCellCount: 4,
      completedBingoCount: 2,
      targetReached: false,
    });

    expect(readProgress()?.opponent).toMatchObject({
      approvedCellCount: 4,
      completedBingoCount: 2,
    });
    // 내 쪽은 건드리지 않는다.
    expect(readProgress()?.me.completedBingoCount).toBe(0);
  });

  test('내 진행률 이벤트는 내 쪽에만 얹는다', () => {
    render();
    const socket = completeHandshake();

    emitProgress(socket, {
      roomId: ROOM_ID,
      gameId: 5,
      participantMemberId: 1,
      bingoBoardId: 100,
      approvedCellCount: 3,
      completedBingoCount: 1,
      targetReached: false,
    });

    expect(readProgress()?.me.completedBingoCount).toBe(1);
    expect(readProgress()?.opponent.completedBingoCount).toBe(0);
  });

  test('이 방 참가자가 아닌 이벤트는 흘린다', () => {
    render();
    const socket = completeHandshake();

    emitProgress(socket, {
      roomId: ROOM_ID,
      gameId: 5,
      participantMemberId: 999,
      bingoBoardId: 300,
      approvedCellCount: 9,
      completedBingoCount: 8,
      targetReached: true,
    });

    expect(readProgress()?.me.completedBingoCount).toBe(0);
    expect(readProgress()?.opponent.completedBingoCount).toBe(0);
  });

  test('화면을 벗어나면 구독을 해지한다', () => {
    render();
    const socket = completeHandshake();

    act(() => renderer?.unmount());
    renderer = null;

    expect(socket.hasSent('UNSUBSCRIBE') || socket.hasSent('DISCONNECT')).toBe(
      true,
    );
  });
});
