/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type {
  BingoBoardResponse,
  BingoCellResponse,
} from '../src/features/bingo/api/bingoApi';
import { useCooperativeProgressSubscription } from '../src/features/bingo/hooks/useCooperativeProgressSubscription';
import {
  FakeWebSocket,
  installWebSocketMock,
  serverFrame,
} from '../jest/webSocketMock';

const ROOM_ID = 7;
const BOARD_ID = 100;
const TOPIC = `/topic/rooms/${ROOM_ID}/bingo-progress`;
const BOARD_KEY = ['bingoBoards', 'active', ROOM_ID];

let restoreWebSocket: () => void;
let queryClient: QueryClient;
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

function buildCell(cellId: number): BingoCellResponse {
  return {
    cellId,
    row: 0,
    col: cellId - 1,
    mission: {
      missionId: cellId,
      missionImageUrl: null,
      type: 'STEP_TOTAL',
      title: `미션 ${cellId}`,
      detail: '',
      decisionCondition: '',
      point: 10,
    },
    verificationStatus: 'PENDING',
    submittedByMemberId: null,
    rejectionReason: null,
  };
}

function buildBoard(): BingoBoardResponse {
  return {
    bingoBoardId: BOARD_ID,
    roomId: ROOM_ID,
    boardSize: 3,
    targetStepCount: 10_000,
    completedBingoCount: 0,
    totalCellCount: 9,
    approvedCellCount: 0,
    cells: [buildCell(1), buildCell(2)],
    completed: false,
    canRenew: false,
    renewalRequired: false,
    renewalMessage: null,
  };
}

function Probe({ enabled }: { enabled: boolean }) {
  useCooperativeProgressSubscription(ROOM_ID, enabled);
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

function readBoard() {
  return queryClient.getQueryData<BingoBoardResponse>(BOARD_KEY);
}

function cellOf(cellId: number) {
  return readBoard()?.cells.find(cell => cell.cellId === cellId);
}

/** 승인 이벤트의 기본형. 테스트마다 바꿀 값만 얹는다. */
function approvedEvent(overrides: Record<string, unknown> = {}) {
  return {
    roomId: ROOM_ID,
    bingoBoardId: BOARD_ID,
    cellId: 1,
    verificationStatus: 'APPROVED',
    submittedByMemberId: 42,
    rejectionReason: null,
    approvedCellCount: 1,
    completedBingoCount: 0,
    ...overrides,
  };
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

describe('useCooperativeProgressSubscription', () => {
  test('협동방이면 진행 토픽을 구독한다', () => {
    render();
    const socket = completeHandshake();

    expect(socket.sentFrames('SUBSCRIBE')[0]).toContain(`destination:${TOPIC}`);
  });

  test('협동방이 아니면 소켓을 열지 않는다', () => {
    render(false);

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  test('남이 채운 칸을 판에 얹는다', () => {
    render();
    const socket = completeHandshake();

    emitProgress(socket, approvedEvent());

    expect(cellOf(1)).toMatchObject({
      verificationStatus: 'APPROVED',
      submittedByMemberId: 42,
    });
    // 다른 칸은 건드리지 않는다.
    expect(cellOf(2)?.verificationStatus).toBe('PENDING');
  });

  test('보드 카운트를 이벤트 값으로 갈아 끼운다', () => {
    render();
    const socket = completeHandshake();

    emitProgress(socket, approvedEvent({ approvedCellCount: 5 }));

    expect(readBoard()?.approvedCellCount).toBe(5);
  });

  test('거절도 사유까지 반영한다', () => {
    render();
    const socket = completeHandshake();

    emitProgress(
      socket,
      approvedEvent({
        verificationStatus: 'REJECTED',
        rejectionReason: '사진에서 미션을 확인할 수 없어요.',
        approvedCellCount: 0,
      }),
    );

    expect(cellOf(1)).toMatchObject({
      verificationStatus: 'REJECTED',
      rejectionReason: '사진에서 미션을 확인할 수 없어요.',
    });
  });

  test('줄 수가 바뀌면 다시 불러온다', () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    render();
    const socket = completeHandshake();

    emitProgress(socket, approvedEvent({ completedBingoCount: 1 }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: BOARD_KEY });
  });

  test('줄 수가 그대로면 다시 불러오지 않는다', () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    render();
    const socket = completeHandshake();

    emitProgress(socket, approvedEvent());

    expect(invalidate).not.toHaveBeenCalled();
  });

  test('지난 판의 이벤트는 흘린다', () => {
    render();
    const socket = completeHandshake();

    emitProgress(
      socket,
      approvedEvent({ bingoBoardId: 999, approvedCellCount: 9 }),
    );

    expect(cellOf(1)?.verificationStatus).toBe('PENDING');
    expect(readBoard()?.approvedCellCount).toBe(0);
  });

  test('판을 아직 안 받았으면 흘린다', () => {
    queryClient.removeQueries({ queryKey: BOARD_KEY });
    render();
    const socket = completeHandshake();

    emitProgress(socket, approvedEvent());

    expect(readBoard()).toBeUndefined();
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
