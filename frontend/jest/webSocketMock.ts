/**
 * stompClient 테스트가 쓰는 가짜 WebSocket. 진짜 소켓을 띄우지 않고 프레임만
 * 주고받게 해서, "무엇을 보냈는가"와 "무엇을 받았을 때 어떻게 움직이는가"를
 * 가른다.
 *
 * 서버 역할은 테스트가 직접 한다 — emit()으로 프레임을 밀어 넣는다.
 */

const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 3;

type SocketEvent = { data: string };

export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  /** 마지막으로 만들어진 소켓. 재연결 테스트에서 새 소켓을 집을 때 쓴다. */
  static get last(): FakeWebSocket {
    const socket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    if (socket === undefined) {
      throw new Error('아직 소켓이 만들어지지 않았다.');
    }
    return socket;
  }

  static reset() {
    FakeWebSocket.instances = [];
  }

  readyState = CONNECTING;
  /** 클라이언트가 보낸 원문. 프레임 단위로 쌓인다. */
  sent: string[] = [];
  closeCallCount = 0;

  onopen: (() => void) | null = null;
  onmessage: ((event: SocketEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.closeCallCount += 1;
    this.readyState = CLOSED;
  }

  // ---- 테스트가 서버 역할을 하는 부분 ----

  /** 핸드셰이크가 끝난 상태로 만든다. */
  open() {
    this.readyState = OPEN;
    this.onopen?.();
  }

  /** 서버가 보낸 것처럼 원문을 밀어 넣는다. 한 청크에 여러 프레임도 된다. */
  emit(payload: string) {
    this.onmessage?.({ data: payload });
  }

  /** 서버·네트워크가 끊은 상황. */
  serverClose() {
    this.readyState = CLOSED;
    this.onclose?.();
  }

  /** 클라이언트가 보낸 프레임 중 이 커맨드로 시작하는 것들. */
  sentFrames(command: string): string[] {
    return this.sent.filter(payload => payload.startsWith(`${command}\n`));
  }

  hasSent(command: string): boolean {
    return this.sentFrames(command).length > 0;
  }
}

/**
 * 전역 WebSocket을 가짜로 바꾼다. 반환값을 afterEach에서 불러 되돌린다.
 */
export function installWebSocketMock() {
  const original = (globalThis as { WebSocket?: unknown }).WebSocket;
  FakeWebSocket.reset();
  (globalThis as { WebSocket?: unknown }).WebSocket = FakeWebSocket;

  return () => {
    (globalThis as { WebSocket?: unknown }).WebSocket = original;
    FakeWebSocket.reset();
  };
}

/** 서버가 보내는 프레임 원문을 만든다. */
export function serverFrame(
  command: string,
  headers: Record<string, string> = {},
  body = '',
): string {
  const headerLines = Object.entries(headers).map(
    ([name, value]) => `${name}:${value}`,
  );
  return `${[command, ...headerLines].join('\n')}\n\n${body}\0`;
}
