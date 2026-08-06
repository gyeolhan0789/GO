/**
 * @format
 */

import {
  FakeWebSocket,
  installWebSocketMock,
  serverFrame,
} from '../jest/webSocketMock';

jest.mock('../src/shared/api/refreshAccessToken', () => ({
  refreshAccessToken: jest.fn(),
}));

// 모듈 전역 상태(소켓·구독·타이머)를 테스트마다 새로 시작하려고 늦게 부른다.
let subscribeStompTopic: typeof import('../src/shared/api/stompClient').subscribeStompTopic;
let refreshAccessToken: jest.Mock;

let restoreWebSocket: () => void;

/** 테스트가 만든 구독. 끝날 때 남김없이 해지해 소켓을 닫는다. */
let opened: { unsubscribe: () => void }[] = [];

function subscribe(destination: string, handler: (message: unknown) => void) {
  const subscription = subscribeStompTopic(destination, handler);
  opened.push(subscription);
  return subscription;
}

/** 소켓이 열리고 CONNECTED까지 받은 상태로 만든다. */
function completeHandshake(socket: FakeWebSocket = FakeWebSocket.last) {
  socket.open();
  socket.emit(serverFrame('CONNECTED', { version: '1.2' }));
  return socket;
}

beforeEach(() => {
  jest.useFakeTimers();
  // 소켓·구독·타이머가 모듈 전역이라 테스트마다 레지스트리를 비운다. 토큰
  // 저장소도 같이 새로 생기므로 반드시 이 뒤에 require해서 같은 인스턴스를 쓴다.
  jest.resetModules();
  restoreWebSocket = installWebSocketMock();
  opened = [];

  refreshAccessToken =
    require('../src/shared/api/refreshAccessToken').refreshAccessToken;
  refreshAccessToken.mockResolvedValue('success');
  require('../src/shared/api/accessTokenStore').setAccessToken('access-token');
  subscribeStompTopic =
    require('../src/shared/api/stompClient').subscribeStompTopic;
});

afterEach(() => {
  opened.forEach(subscription => subscription.unsubscribe());
  restoreWebSocket();
  jest.useRealTimers();
});

describe('구독과 연결', () => {
  test('첫 구독이 소켓을 열고 CONNECT를 보낸다', () => {
    subscribe('/topic/rooms/7/battle-progress', () => {});

    const socket = FakeWebSocket.last;
    expect(socket.url).toMatch(/^ws:\/\/.+\/ws$/);

    socket.open();
    expect(socket.hasSent('CONNECT')).toBe(true);
  });

  test('인증을 CONNECT 프레임의 Authorization으로 보낸다', () => {
    // RN의 WebSocket은 핸드셰이크에 커스텀 헤더를 못 실어서 이 경로뿐이다.
    subscribe('/topic/a', () => {});
    FakeWebSocket.last.open();

    expect(FakeWebSocket.last.sentFrames('CONNECT')[0]).toContain(
      'Authorization:Bearer access-token',
    );
  });

  test('CONNECTED를 받아야 SUBSCRIBE를 보낸다', () => {
    subscribe('/topic/rooms/7/battle-progress', () => {});
    const socket = FakeWebSocket.last;

    socket.open();
    expect(socket.hasSent('SUBSCRIBE')).toBe(false);

    socket.emit(serverFrame('CONNECTED', { version: '1.2' }));
    expect(socket.sentFrames('SUBSCRIBE')[0]).toContain(
      'destination:/topic/rooms/7/battle-progress',
    );
  });

  test('구독이 여럿이어도 소켓은 하나다', () => {
    subscribe('/topic/a', () => {});
    subscribe('/topic/b', () => {});
    completeHandshake();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.last.sentFrames('SUBSCRIBE')).toHaveLength(2);
  });

  test('연결된 뒤에 붙은 구독은 곧바로 신청한다', () => {
    subscribe('/topic/a', () => {});
    const socket = completeHandshake();

    subscribe('/topic/b', () => {});

    expect(socket.sentFrames('SUBSCRIBE')).toHaveLength(2);
  });
});

describe('메시지 전달', () => {
  test('구독 id로 갈라 그 구독자에게만 넘긴다', () => {
    const first = jest.fn();
    const second = jest.fn();
    subscribe('/topic/a', first);
    subscribe('/topic/b', second);
    const socket = completeHandshake();

    socket.emit(
      serverFrame('MESSAGE', { subscription: 'sub-1' }, '{"step":10}'),
    );

    expect(first).toHaveBeenCalledWith({ step: 10 });
    expect(second).not.toHaveBeenCalled();
  });

  test('모르는 구독 id는 흘린다', () => {
    const handler = jest.fn();
    subscribe('/topic/a', handler);
    const socket = completeHandshake();

    socket.emit(serverFrame('MESSAGE', { subscription: 'sub-999' }, '{}'));

    expect(handler).not.toHaveBeenCalled();
  });

  test('본문이 JSON이 아니면 넘기지 않는다', () => {
    const handler = jest.fn();
    subscribe('/topic/a', handler);
    const socket = completeHandshake();

    socket.emit(serverFrame('MESSAGE', { subscription: 'sub-1' }, 'not-json'));

    expect(handler).not.toHaveBeenCalled();
  });

  test('청크가 잘려 와도 이어 붙여 읽는다', () => {
    const handler = jest.fn();
    subscribe('/topic/a', handler);
    const socket = completeHandshake();

    socket.emit('MESSAGE\nsubscription:sub-1\n\n{"step":');
    expect(handler).not.toHaveBeenCalled();

    socket.emit('10}\0');
    expect(handler).toHaveBeenCalledWith({ step: 10 });
  });
});

describe('해지', () => {
  test('해지하면 UNSUBSCRIBE를 보낸다', () => {
    const subscription = subscribe('/topic/a', () => {});
    subscribe('/topic/b', () => {});
    const socket = completeHandshake();

    subscription.unsubscribe();

    expect(socket.sentFrames('UNSUBSCRIBE')[0]).toContain('id:sub-1');
    // 아직 남은 구독이 있으니 소켓은 살아 있다.
    expect(socket.closeCallCount).toBe(0);
  });

  test('마지막 구독이 해지되면 소켓을 닫는다', () => {
    const subscription = subscribe('/topic/a', () => {});
    const socket = completeHandshake();

    subscription.unsubscribe();

    expect(socket.hasSent('DISCONNECT')).toBe(true);
    expect(socket.closeCallCount).toBe(1);
  });

  test('두 번 해지해도 남의 구독을 건드리지 않는다', () => {
    const first = subscribe('/topic/a', () => {});
    const second = jest.fn();
    subscribe('/topic/b', second);
    const socket = completeHandshake();

    first.unsubscribe();
    first.unsubscribe();

    socket.emit(serverFrame('MESSAGE', { subscription: 'sub-2' }, '{"ok":1}'));
    expect(second).toHaveBeenCalledWith({ ok: 1 });
  });

  test('구독이 다 빠지면 재연결하지 않는다', () => {
    const subscription = subscribe('/topic/a', () => {});
    completeHandshake();

    subscription.unsubscribe();
    jest.advanceTimersByTime(60_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe('재연결', () => {
  test('서버가 끊으면 잠시 뒤 다시 붙는다', () => {
    subscribe('/topic/a', () => {});
    const socket = completeHandshake();

    socket.serverClose();
    expect(FakeWebSocket.instances).toHaveLength(1);

    jest.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  test('다시 붙으면 살아 있는 구독을 다시 신청한다', () => {
    subscribe('/topic/rooms/7/battle-progress', () => {});
    completeHandshake().serverClose();

    jest.advanceTimersByTime(1_000);
    const reconnected = completeHandshake();

    expect(reconnected.sentFrames('SUBSCRIBE')[0]).toContain(
      'destination:/topic/rooms/7/battle-progress',
    );
  });

  test('연달아 실패하면 재시도 간격을 늘린다', () => {
    subscribe('/topic/a', () => {});
    completeHandshake().serverClose();

    jest.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // 두 번째는 붙자마자 끊겼다. 1초로는 아직 부족하다.
    FakeWebSocket.last.serverClose();
    jest.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    jest.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  test('연결에 성공하면 재시도 간격이 처음으로 돌아온다', () => {
    subscribe('/topic/a', () => {});
    completeHandshake().serverClose();

    jest.advanceTimersByTime(1_000);
    completeHandshake().serverClose();

    // 성공했다 끊긴 것이므로 다시 1초다.
    jest.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });
});

describe('하트비트', () => {
  test('합의한 간격마다 개행을 보낸다', () => {
    subscribe('/topic/a', () => {});
    const socket = FakeWebSocket.last;
    socket.open();
    socket.emit(serverFrame('CONNECTED', { 'heart-beat': '10000,10000' }));
    const before = socket.sent.length;

    jest.advanceTimersByTime(10_000);

    expect(socket.sent.slice(before)).toEqual(['\n']);
  });

  test('서버가 하트비트를 안 한다고 해도 유휴 소켓을 만들지 않는다', () => {
    // 우리 서버가 실제로 주는 응답이다. 규약대로 전송까지 끄면 이벤트가 없는
    // 동안 한 바이트도 흐르지 않아 통신사 NAT가 연결을 걷어낸다.
    subscribe('/topic/a', () => {});
    const socket = FakeWebSocket.last;
    socket.open();
    socket.emit(serverFrame('CONNECTED', { 'heart-beat': '0,0' }));
    const before = socket.sent.length;

    jest.advanceTimersByTime(60_000);

    // 10초 간격으로 여섯 번. 서버가 못 보낸다고 했으니 수신 감시는 돌지 않아
    // 이 사이에 재연결이 끼어들지 않는다.
    expect(socket.sent.slice(before)).toEqual(Array(6).fill('\n'));
    expect(socket.closeCallCount).toBe(0);
  });

  test('받는 하트비트가 끊기면 죽은 연결로 보고 다시 붙는다', () => {
    // 모바일에서는 close 이벤트 없이 소켓이 조용히 죽는다.
    subscribe('/topic/a', () => {});
    const socket = FakeWebSocket.last;
    socket.open();
    socket.emit(serverFrame('CONNECTED', { 'heart-beat': '10000,10000' }));

    jest.advanceTimersByTime(20_001);
    expect(socket.closeCallCount).toBe(1);

    jest.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  test('무엇이든 받고 있으면 끊지 않는다', () => {
    subscribe('/topic/a', () => {});
    const socket = FakeWebSocket.last;
    socket.open();
    socket.emit(serverFrame('CONNECTED', { 'heart-beat': '10000,10000' }));

    // 서버 하트비트가 제때 오는 상황.
    jest.advanceTimersByTime(15_000);
    socket.emit('\n');
    jest.advanceTimersByTime(15_000);

    expect(socket.closeCallCount).toBe(0);
  });
});

describe('ERROR 프레임', () => {
  test('토큰을 다시 받아 한 번 더 붙어 본다', async () => {
    subscribe('/topic/a', () => {});
    const socket = completeHandshake();

    socket.emit(serverFrame('ERROR', { message: 'unauthorized' }));
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  test('재발급이 안 되면 곧바로 다시 붙지 않는다', async () => {
    refreshAccessToken.mockResolvedValue('rejected');
    subscribe('/topic/a', () => {});

    completeHandshake().emit(serverFrame('ERROR', {}));
    await Promise.resolve();

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  test('새 토큰으로도 거절당하면 재발급을 반복하지 않는다', async () => {
    subscribe('/topic/a', () => {});
    completeHandshake().emit(serverFrame('ERROR', {}));
    await Promise.resolve();

    // 새 토큰을 들고 붙었는데 CONNECTED를 못 받고 또 거절당했다.
    const retried = FakeWebSocket.last;
    retried.open();
    retried.emit(serverFrame('ERROR', {}));

    // 재발급은 그대로 한 번. 다만 연결은 간격을 두고 계속 시도한다.
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(retried.closeCallCount).toBe(1);

    jest.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  test('연결에 성공하면 다음 ERROR에서 다시 재발급을 시도한다', async () => {
    subscribe('/topic/a', () => {});
    completeHandshake().emit(serverFrame('ERROR', {}));
    await Promise.resolve();

    // 새 토큰으로 붙어 CONNECTED까지 받았다 — 토큰은 그때 유효했다는 뜻이라,
    // 나중에 또 거절당하면 만료로 보고 한 번 더 받아 본다.
    completeHandshake(FakeWebSocket.last).emit(serverFrame('ERROR', {}));

    expect(refreshAccessToken).toHaveBeenCalledTimes(2);
  });
});
