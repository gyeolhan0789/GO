/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  useRoomPresenceSubscription,
  type RoomPresenceEvent,
  type RoomPresenceMember,
} from '../src/features/room/hooks/useRoomPresenceSubscription';
import {
  FakeWebSocket,
  installWebSocketMock,
  serverFrame,
} from '../jest/webSocketMock';

const ROOM_ID = 10;
const TOPIC = `/topic/rooms/${ROOM_ID}/presence`;
const ME = 1;
const OPPONENT = 2;

let restoreWebSocket: () => void;
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

/** 훅이 내놓은 마지막 값. 렌더 밖에서 읽으려고 받아 둔다. */
let lastOnlineMembers: RoomPresenceMember[] | null = null;
let receivedEvents: RoomPresenceEvent[] = [];

function Probe({ enabled }: { enabled: boolean }) {
  const { onlineMembers } = useRoomPresenceSubscription({
    roomId: ROOM_ID,
    enabled,
    onEvent: event => {
      receivedEvents.push(event);
    },
  });
  lastOnlineMembers = onlineMembers;
  return null;
}

function render(enabled = true) {
  act(() => {
    renderer = ReactTestRenderer.create(<Probe enabled={enabled} />);
  });
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

function emitPresence(
  socket: FakeWebSocket,
  event: Record<string, unknown>,
): void {
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

function member(memberId: number, nickname: string | null) {
  return { memberId, nickname };
}

function presenceEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: 'JOINED',
    roomId: ROOM_ID,
    memberId: ME,
    onlineCount: 1,
    onlineMembers: [member(ME, '산책러')],
    ...overrides,
  };
}

beforeEach(() => {
  restoreWebSocket = installWebSocketMock();
  lastOnlineMembers = null;
  receivedEvents = [];
});

afterEach(() => {
  if (renderer) {
    act(() => renderer?.unmount());
    renderer = null;
  }
  restoreWebSocket();
});

describe('useRoomPresenceSubscription', () => {
  test('방 화면에 들어오면 presence 토픽을 구독한다', () => {
    render();
    const socket = completeHandshake();

    expect(socket.sentFrames('SUBSCRIBE')[0]).toContain(`destination:${TOPIC}`);
  });

  test('방 멤버가 아니면 구독하지 않는다', () => {
    // 서버는 멤버가 아닌 구독을 ERROR로 끊고, 우리 클라이언트는 그 ERROR를
    // 토큰 문제로 읽어 소켓을 다시 연다. 다시 열면 같은 구독을 또 보내서
    // 빙고·대결 구독까지 같이 끊기는 재연결 루프가 된다.
    render(false);

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  test('구독 전에는 접속자를 모른다고 답한다', () => {
    // 빈 배열(아무도 없음)과 구별돼야 이 값으로 판정하는 쪽이 오해하지 않는다.
    render();
    completeHandshake();

    expect(lastOnlineMembers).toBeNull();
  });

  test('JOINED 스냅샷으로 접속자를 채운다', () => {
    render();
    const socket = completeHandshake();

    emitPresence(
      socket,
      presenceEvent({
        memberId: OPPONENT,
        onlineCount: 2,
        onlineMembers: [member(ME, '산책러'), member(OPPONENT, '친구')],
      }),
    );

    expect(lastOnlineMembers).toEqual([
      member(ME, '산책러'),
      member(OPPONENT, '친구'),
    ]);
  });

  test('LEFT는 스냅샷으로 갈아 끼운다 — 목록에서 직접 빼지 않는다', () => {
    render();
    const socket = completeHandshake();
    emitPresence(
      socket,
      presenceEvent({
        onlineCount: 2,
        onlineMembers: [member(ME, '산책러'), member(OPPONENT, '친구')],
      }),
    );

    // 스냅샷에 이전에 못 본 멤버가 들어 있다. 증감식이면 이 값을 놓치지만
    // 스냅샷을 그대로 쓰면 서버와 항상 같아진다.
    emitPresence(
      socket,
      presenceEvent({
        type: 'LEFT',
        memberId: ME,
        onlineCount: 2,
        onlineMembers: [member(OPPONENT, '친구'), member(3, '늦게 온 사람')],
      }),
    );

    expect(lastOnlineMembers).toEqual([
      member(OPPONENT, '친구'),
      member(3, '늦게 온 사람'),
    ]);
  });

  test('SYNC도 같은 스냅샷 규칙으로 반영한다', () => {
    // 같은 사용자가 다른 기기에서 같은 방을 열면 온다. 접속자 수는 안 늘어난다.
    render();
    const socket = completeHandshake();

    emitPresence(
      socket,
      presenceEvent({ type: 'SYNC', onlineMembers: [member(ME, '산책러')] }),
    );

    expect(lastOnlineMembers).toEqual([member(ME, '산책러')]);
  });

  test('닉네임이 비어 있어도 그대로 받는다', () => {
    // 서버가 memberId로 닉네임을 못 찾으면 그 자리가 null로 온다.
    render();
    const socket = completeHandshake();

    emitPresence(
      socket,
      presenceEvent({ onlineMembers: [member(OPPONENT, null)] }),
    );

    expect(lastOnlineMembers).toEqual([member(OPPONENT, null)]);
  });

  test('다른 방 이벤트는 흘린다', () => {
    render();
    const socket = completeHandshake();

    emitPresence(
      socket,
      presenceEvent({ roomId: 999, onlineMembers: [member(3, '남의 방')] }),
    );

    expect(lastOnlineMembers).toBeNull();
    expect(receivedEvents).toHaveLength(0);
  });

  test('이벤트를 호출부에도 넘긴다', () => {
    render();
    const socket = completeHandshake();

    emitPresence(socket, presenceEvent({ type: 'LEFT', memberId: OPPONENT }));

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]).toMatchObject({
      type: 'LEFT',
      memberId: OPPONENT,
    });
  });

  test('방 화면을 벗어나면 구독을 해지한다', () => {
    // 구독 해지가 곧 퇴장이다. 안 보내면 서버는 계속 접속 중으로 본다.
    render();
    const socket = completeHandshake();

    act(() => renderer?.unmount());
    renderer = null;

    expect(socket.sentFrames('UNSUBSCRIBE')).toHaveLength(1);
  });
});
