/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import type { RoomDetailResponse } from '../src/features/room/api/roomApi';
import { BattleWaitingRoom } from '../src/screens/WalkRoomDetailScreen/components/BattleWaitingRoom';
import {
  FakeWebSocket,
  installWebSocketMock,
  serverFrame,
} from '../jest/webSocketMock';

const ROOM_ID = 10;
const ME = 1;
const OPPONENT = 2;
const QUEUE = '/user/queue/battle';

let restoreWebSocket: () => void;
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

function buildMember(memberId: number, nickname: string) {
  return {
    memberId,
    nickname,
    host: memberId === ME,
    completedMissionCount: 0,
    joinedAt: '2026-08-05T00:00:00',
    bingoBoardId: null,
    gender: 'MALE' as const,
    defaultImageUrl: null,
    equippedItems: [],
  };
}

function buildRoom(memberIds: number[]): RoomDetailResponse {
  return {
    roomId: ROOM_ID,
    name: '한판 붙자',
    mode: 'BATTLE',
    status: 'ACTIVE',
    targetBingoCount: 2,
    targetStepCount: null,
    totalMissionCount: 9,
    completedMissionCount: 0,
    hostId: ME,
    startedAt: null,
    members: memberIds.map(id =>
      buildMember(id, id === ME ? '나' : '상대'),
    ) as RoomDetailResponse['members'],
  };
}

type RenderOptions = {
  memberIds?: number[];
  isBoardReady?: boolean;
  isHost?: boolean;
};

const handlers = {
  onEnterBoard: jest.fn(),
  onOpponentJoined: jest.fn(),
  onMatchingCancelled: jest.fn(),
  onCancelBattle: jest.fn(),
  onForfeit: jest.fn(),
};

function render({
  memberIds = [ME],
  isBoardReady = false,
  isHost = true,
}: RenderOptions = {}) {
  act(() => {
    renderer = ReactTestRenderer.create(
      <BattleWaitingRoom
        room={buildRoom(memberIds)}
        myMemberId={ME}
        isHost={isHost}
        isBoardReady={isBoardReady}
        onEnterBoard={handlers.onEnterBoard}
        onOpponentJoined={handlers.onOpponentJoined}
        onCancelBattle={handlers.onCancelBattle}
        onForfeit={handlers.onForfeit}
        onMatchingCancelled={handlers.onMatchingCancelled}
      />,
    );
  });
  return renderer!.root;
}

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

function emitMatching(socket: FakeWebSocket, event: Record<string, unknown>) {
  act(() => {
    socket.emit(
      serverFrame(
        'MESSAGE',
        { subscription: subscriptionIdOf(socket), destination: QUEUE },
        JSON.stringify(event),
      ),
    );
  });
}

function countdownStarted(overrides: Record<string, unknown> = {}) {
  return {
    type: 'BATTLE_COUNTDOWN_STARTED',
    roomId: ROOM_ID,
    requestId: 20,
    hostId: ME,
    inviteeId: OPPONENT,
    countdownSeconds: 3,
    ...overrides,
  };
}

function texts(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    // 카운트다운 숫자는 문자열이 아니라 number로 렌더된다.
    .filter(
      (child): child is string | number =>
        typeof child === 'string' || typeof child === 'number',
    )
    .map(String)
    .join(' | ');
}


beforeEach(() => {
  jest.useFakeTimers();
  restoreWebSocket = installWebSocketMock();
  handlers.onEnterBoard.mockClear();
  handlers.onOpponentJoined.mockClear();
  handlers.onMatchingCancelled.mockClear();
  handlers.onCancelBattle.mockClear();
  handlers.onForfeit.mockClear();
});

afterEach(() => {
  if (renderer) {
    act(() => renderer?.unmount());
    renderer = null;
  }
  restoreWebSocket();
  jest.useRealTimers();
});

describe('BattleWaitingRoom', () => {
  test('개인 배틀 큐를 구독한다', () => {
    render();
    const socket = completeHandshake();

    expect(socket.sentFrames('SUBSCRIBE')[0]).toContain(
      `destination:${QUEUE}`,
    );
  });

  test('상대가 없으면 수락을 기다린다고 알린다', () => {
    const root = render();

    expect(texts(root)).toContain('상대가 초대를 수락하기를 기다리고');
  });

  test('상대를 기다리는 동안에는 판으로 보내지 않는다', () => {
    render();

    expect(handlers.onEnterBoard).not.toHaveBeenCalled();
  });

  test('카운트다운 이벤트를 받으면 남은 초를 크게 보여준다', () => {
    const root = render();
    const socket = completeHandshake();

    emitMatching(socket, countdownStarted());

    // 3초뿐이라 문구가 아니라 숫자로 센다.
    expect(texts(root)).toContain('3');
    expect(texts(root)).toContain('곧 시작해요');
  });

  test('카운트다운이 끝나면 자동으로 판에 들어간다', () => {
    render();
    const socket = completeHandshake();

    emitMatching(socket, countdownStarted());
    // 초마다 타이머를 새로 거는 구조라, 한 번에 3초를 밀면 사이의 렌더가
    // 흘러가지 않아 다음 타이머가 걸리지 않는다.
    for (let tick = 0; tick < 3; tick += 1) {
      act(() => {
        jest.advanceTimersByTime(1_000);
      });
    }

    // 버튼을 누르지 않아도 둘이 같은 순간에 들어가야 한다.
    expect(handlers.onEnterBoard).toHaveBeenCalled();
  });

  test('카운트다운 이벤트가 오면 방을 다시 읽는다', () => {
    render();
    const socket = completeHandshake();

    emitMatching(socket, countdownStarted());

    // 상대가 방금 수락해 멤버가 됐다 — 다시 읽어야 아바타가 보인다.
    expect(handlers.onOpponentJoined).toHaveBeenCalled();
  });

  test('파라미터로 받은 카운트다운을 이어서 센다', () => {
    // 수락한 쪽은 이벤트가 대기방 도착보다 먼저 와서 값을 파라미터로 들고 온다.
    act(() => {
      renderer = ReactTestRenderer.create(
        <BattleWaitingRoom
          room={buildRoom([ME, OPPONENT])}
          myMemberId={ME}
          isHost={false}
          initialCountdownSeconds={3}
          isBoardReady
          onEnterBoard={handlers.onEnterBoard}
          onOpponentJoined={handlers.onOpponentJoined}
          onCancelBattle={handlers.onCancelBattle}
          onForfeit={handlers.onForfeit}
          onMatchingCancelled={handlers.onMatchingCancelled}
        />,
      );
    });

    expect(texts(renderer!.root)).toContain('곧 시작해요');

    for (let tick = 0; tick < 3; tick += 1) {
      act(() => {
        jest.advanceTimersByTime(1_000);
      });
    }
    expect(handlers.onEnterBoard).toHaveBeenCalled();
  });

  test('카운트다운 중에는 판으로 먼저 보내지 않는다', () => {
    // 실제 순서: 상대가 수락하기 전이라 판이 없다가, 카운트다운 이벤트가 오고
    // 그 뒤 방을 다시 읽어 정원이 차고 판이 준비된다. 그 사이 카운트다운을
    // 건너뛰고 들어가면 양쪽이 같은 순간에 시작하지 못한다.
    render({ memberIds: [ME] });
    const socket = completeHandshake();
    emitMatching(socket, countdownStarted());

    act(() => {
      renderer!.update(
        <BattleWaitingRoom
          room={buildRoom([ME, OPPONENT])}
          myMemberId={ME}
          isHost
          isBoardReady
          onEnterBoard={handlers.onEnterBoard}
          onOpponentJoined={handlers.onOpponentJoined}
          onCancelBattle={handlers.onCancelBattle}
          onForfeit={handlers.onForfeit}
          onMatchingCancelled={handlers.onMatchingCancelled}
        />,
      );
    });

    expect(handlers.onEnterBoard).not.toHaveBeenCalled();
  });

  test('상대가 없으면 빙고판이 있어도 판으로 보내지 않는다', () => {
    // 이 회귀가 실제로 났다. 판만 보고 열어주면 혼자 걷다 끝난다.
    render({ memberIds: [ME], isBoardReady: true });

    expect(handlers.onEnterBoard).not.toHaveBeenCalled();
  });

  test('이미 시작된 대결에 다시 들어오면 곧바로 판으로 보낸다', () => {
    // 예전에는 여기서 '대결 시작'을 눌러야 했다 — 누를 일이 이것뿐인 버튼이라
    // 화면을 한 번 더 거치게만 했다.
    render({ memberIds: [ME, OPPONENT], isBoardReady: true });

    expect(handlers.onEnterBoard).toHaveBeenCalled();
  });

  test('다른 방의 이벤트는 무시한다', () => {
    const root = render();
    const socket = completeHandshake();

    emitMatching(socket, countdownStarted({ roomId: 999 }));

    expect(texts(root)).not.toContain('3초 후 시작해요');
  });

  test('거절 이벤트는 무산으로 알린다', () => {
    render();
    const socket = completeHandshake();

    emitMatching(
      socket,
      countdownStarted({
        type: 'INVITATION_REJECTED',
        countdownSeconds: null,
      }),
    );

    expect(handlers.onMatchingCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'INVITATION_REJECTED' }),
    );
  });

  test('취소 이벤트도 무산으로 알린다', () => {
    render();
    const socket = completeHandshake();

    emitMatching(
      socket,
      countdownStarted({
        type: 'INVITATION_CANCELLED',
        countdownSeconds: null,
      }),
    );

    expect(handlers.onMatchingCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'INVITATION_CANCELLED' }),
    );
  });

  test('카운트다운 값이 마운트 뒤에 도착해도 이어서 센다', () => {
    // 수락한 쪽의 실제 순서다: 화면에 먼저 도착하고, 이벤트가 그 뒤에
    // 파라미터를 갱신한다. 초기값만 읽으면 이 갱신을 놓친다.
    const root = render({ memberIds: [ME, OPPONENT], isBoardReady: true });
    expect(texts(root)).not.toContain('초 후 시작해요');

    act(() => {
      renderer!.update(
        <BattleWaitingRoom
          room={buildRoom([ME, OPPONENT])}
          myMemberId={ME}
          isHost
          initialCountdownSeconds={3}
          isBoardReady
          onEnterBoard={handlers.onEnterBoard}
          onOpponentJoined={handlers.onOpponentJoined}
          onCancelBattle={handlers.onCancelBattle}
          onForfeit={handlers.onForfeit}
          onMatchingCancelled={handlers.onMatchingCancelled}
        />,
      );
    });

    expect(texts(root)).toContain('곧 시작해요');
  });

  test('시작 전에는 방장에게 대결 취소가 보인다', () => {
    const root = render({ memberIds: [ME], isBoardReady: false, isHost: true });

    const [cancel] = root.findAll(
      node =>
        node.props.accessibilityLabel === '대결 취소' &&
        typeof node.props.onPress === 'function',
    );
    expect(cancel).toBeTruthy();
    act(() => cancel.props.onPress());
    expect(handlers.onCancelBattle).toHaveBeenCalled();
  });

  test('방장이 아니면 시작 전 취소가 없다', () => {
    const root = render({
      memberIds: [ME],
      isBoardReady: false,
      isHost: false,
    });

    expect(
      root.findAll(node => node.props.accessibilityLabel === '대결 취소'),
    ).toHaveLength(0);
  });

  test('시작된 대결에는 기권이 보인다', () => {
    const root = render({ memberIds: [ME, OPPONENT], isBoardReady: true });

    const [forfeit] = root.findAll(
      node =>
        node.props.accessibilityLabel === '기권하기' &&
        typeof node.props.onPress === 'function',
    );
    expect(forfeit).toBeTruthy();
    act(() => forfeit.props.onPress());
    expect(handlers.onForfeit).toHaveBeenCalled();
  });

  test('카운트다운 중에는 접는 문이 숨는다', () => {
    const root = render({ memberIds: [ME, OPPONENT], isBoardReady: true });
    const socket = completeHandshake();

    emitMatching(socket, countdownStarted());

    expect(
      root.findAll(
        node =>
          node.props.accessibilityLabel === '기권하기' ||
          node.props.accessibilityLabel === '대결 취소',
      ),
    ).toHaveLength(0);
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
