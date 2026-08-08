// 서버가 쏘는 토픽을 구독하는 STOMP 클라이언트. 소켓 하나를 모든 구독이
// 나눠 쓰고, 마지막 구독이 해지되면 닫는다.
//
// 이 클라이언트는 **구독 전용**이다. 백엔드에 setApplicationDestinationPrefixes가
// 없어 `@MessageMapping`으로 갈 목적지가 아예 없다. 브로커 목적지(`/topic`)로 SEND를
// 보내면 SimpleBroker가 구독자에게 중계해 주지만, 그 경로는 서버가 내용을 검증하지
// 않아 신뢰 경계 밖이라 쓰지 않는다. 서버로 보내는 것은 전부 REST를 거친다.

import {
  decodeFrames,
  encodeFrameBytes,
  HEARTBEAT_FRAME,
  negotiateHeartBeat,
  parseHeartBeat,
  type StompFrame,
} from '../lib/stompFrame';
import { getAccessToken } from './accessTokenStore';
import { BASE_URL } from './baseUrl';
import { refreshAccessToken } from './refreshAccessToken';

const ENDPOINT_PATH = '/ws';
const OPEN = 1;

/**
 * 핸드셰이크에서 요청하는 서브프로토콜(`Sec-WebSocket-Protocol`).
 *
 * Spring은 이 값으로 STOMP 핸들러를 고른다. 안 보내면 연결은 열리지만 서버가
 * 이 세션을 STOMP로 취급하지 않아 CONNECT 프레임에 아무 응답도 하지 않는다 —
 * 에러도 안 나고 조용히 멈춰서 원인이 드러나지 않는다.
 *
 * 선호하는 버전을 앞에 둔다. 서버가 고른 값이 응답의 프로토콜로 돌아온다.
 */
const SUB_PROTOCOLS = ['v12.stomp', 'v11.stomp', 'v10.stomp'];

/** 우리가 보낼 수 있는 최소 간격과 받고 싶은 간격(ms). */
const CLIENT_HEART_BEAT: [number, number] = [10_000, 10_000];

/**
 * 하트비트가 이 배수만큼 끊기면 죽은 연결로 본다. 규약이 권하는 여유이고,
 * 한 번 늦었다고 끊으면 잠깐의 지연에도 재연결이 돈다.
 */
const HEART_BEAT_GRACE = 2;

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

type Subscription = {
  id: string;
  destination: string;
  handler: (message: never) => void;
  /** 서버에 SUBSCRIBE를 보냈는지. 연결 전에 만들어진 구독은 CONNECTED 때 보낸다. */
  sent: boolean;
  /** ready를 푸는 쪽. 한 번만 부르면 되고 두 번 불러도 해가 없다. */
  markReady: () => void;
};

export type StompSubscription = {
  unsubscribe: () => void;
  /**
   * SUBSCRIBE가 서버로 나간 뒤에 풀린다. 구독보다 먼저 도착하면 안 되는 요청
   * (예: 대결 수락 — 서버가 그 응답으로 이벤트를 쏜다)을 이 뒤로 미루는 데 쓴다.
   *
   * 브로커가 실제로 등록을 마쳤다는 확인은 아니다. RECEIPT를 받아야 그것까지
   * 보장되는데 Spring의 SimpleBroker가 SUBSCRIBE에 RECEIPT를 주는지 확인하지
   * 못했고, 안 오면 여기서 영영 안 풀린다. 프레임이 이미 열린 소켓으로 나가는
   * 것에 비해 뒤따르는 HTTP 요청은 왕복이 훨씬 길어서 실질적인 역전은 없고,
   * 그래도 놓친 경우의 복구 경로는 호출부가 따로 갖는다.
   */
  ready: Promise<void>;
};

let socket: WebSocket | null = null;
let status: 'idle' | 'connecting' | 'connected' = 'idle';
const subscriptions = new Map<string, Subscription>();

/** 아직 프레임이 되지 못한 수신 조각. */
let buffer = '';
let nextSubscriptionId = 0;

let sendTimer: ReturnType<typeof setInterval> | null = null;
let receiveTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * CONNECT를 보낸 뒤 CONNECTED를 기다리는 타이머.
 *
 * 소켓이 열려도 STOMP가 성립하지 않는 경우가 있다(서버가 응답을 안 하거나 응답이
 * 우리에게 도달하지 않는다). 그때 이 소켓을 그대로 두면 `openSocket`이 "이미
 * 붙는 중"으로 보고 넘어가서, 이후 구독이 전부 이 죽은 소켓에 얹히고 영영
 * 살아나지 않는다. 시간 안에 안 오면 버리고 다시 붙는다.
 */
let connectTimer: ReturnType<typeof setTimeout> | null = null;
let lastReceivedAt = 0;
let reconnectAttempt = 0;

/**
 * ERROR 프레임을 받고 토큰을 다시 받아 본 적이 있는지. 만료된 토큰으로
 * 무한히 재접속하는 것을 막으려고 연결당 한 번만 시도한다.
 */
let didRetryWithNewToken = false;

function resolveSocketUrl(): string {
  return `${BASE_URL.replace(/^http/, 'ws')}${ENDPOINT_PATH}`;
}

/**
 * 소켓은 조용히 죽는 일이 많아서(close 이벤트 없이 끊기거나, 서버가 핸드셰이크를
 * 거부해도 앱에는 아무 표시가 안 남는다) 연결 수명만 로그로 남긴다.
 */
function log(message: string, detail?: unknown) {
  if (detail === undefined) {
    console.log(`[stomp] ${message}`);
    return;
  }
  console.log(`[stomp] ${message}`, detail);
}

function clearTimer(timer: ReturnType<typeof setInterval> | null) {
  if (timer !== null) {
    clearInterval(timer);
  }
}

function stopTimers() {
  clearTimer(sendTimer);
  clearTimer(receiveTimer);
  sendTimer = null;
  receiveTimer = null;

  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  clearConnectTimer();
}

function clearConnectTimer() {
  if (connectTimer !== null) {
    clearTimeout(connectTimer);
    connectTimer = null;
  }
}

/** CONNECTED가 이 시간 안에 안 오면 그 소켓은 못 쓰는 것으로 본다. */
const CONNECT_TIMEOUT_MS = 8_000;

function startConnectTimer() {
  clearConnectTimer();
  connectTimer = setTimeout(() => {
    connectTimer = null;
    if (status === 'connected') {
      return;
    }
    log('CONNECTED 안 옴 — 소켓 버리고 재시도', {
      readyState: socket?.readyState ?? null,
    });
    closeSocket();
    scheduleReconnect();
  }, CONNECT_TIMEOUT_MS);
}

function sendRaw(payload: string | Uint8Array) {
  if (socket !== null && socket.readyState === OPEN) {
    // RN 타입 정의가 ArrayBufferView를 안 받지만 런타임은 바이너리 전송을 지원한다.
    (socket as { send: (data: string | Uint8Array) => void }).send(payload);
  }
}

function sendFrame(frame: StompFrame) {
  // 문자열이 아니라 바이트로 보낸다 — RN 안드로이드 브리지가 문자열 속 NUL
  // (프레임 종결자)을 잘라먹어서, 텍스트로 보내면 서버가 프레임 끝을 못 만나
  // 영영 응답하지 않는다. encodeFrameBytes 주석 참고.
  sendRaw(encodeFrameBytes(frame));
}

/**
 * 인증을 HTTP 헤더가 아니라 CONNECT 프레임의 Authorization으로 보낸다. 백엔드의
 * WebSocketAuthenticationInterceptor가 CONNECT에서만 토큰을 읽기 때문이다.
 *
 * (RN은 생성자 세 번째 인자로 핸드셰이크 헤더를 받으므로 그쪽도 가능하긴 하다.
 * 다만 브라우저 WebSocket API에는 없는 확장이고, 프레임 인증이 STOMP 관례라
 * 재연결할 때마다 자연스럽게 다시 인증된다.)
 */
function sendConnectFrame() {
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    'accept-version': '1.2',
    host: new URL(BASE_URL).host,
    'heart-beat': CLIENT_HEART_BEAT.join(','),
  };

  if (accessToken !== null) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  sendFrame({ command: 'CONNECT', headers, body: '' });
  startConnectTimer();
}

function subscribeOnServer(subscription: Subscription) {
  log('SUBSCRIBE', subscription.destination);
  sendFrame({
    command: 'SUBSCRIBE',
    headers: {
      id: subscription.id,
      destination: subscription.destination,
      // 구독 전용이라 되돌려줄 게 없다. 서버가 확인 응답을 만들지 않게 둔다.
      ack: 'auto',
    },
    body: '',
  });
  subscription.sent = true;
  subscription.markReady();
}

function startHeartBeat(header: string | undefined) {
  const { sendEvery, expectEvery } = negotiateHeartBeat(
    CLIENT_HEART_BEAT,
    parseHeartBeat(header),
  );

  if (sendEvery > 0) {
    sendTimer = setInterval(() => sendRaw(HEARTBEAT_FRAME), sendEvery);
  }

  if (expectEvery > 0) {
    const deadline = expectEvery * HEART_BEAT_GRACE;
    // 모바일에서는 close 이벤트 없이 소켓이 조용히 죽는 일이 잦다. 받은 게
    // 끊기면 살아 있다고 믿지 않고 우리가 먼저 끊고 다시 붙는다.
    receiveTimer = setInterval(() => {
      if (Date.now() - lastReceivedAt >= deadline) {
        reconnect();
      }
    }, deadline);
  }
}

function handleConnected(frame: StompFrame) {
  log('CONNECTED 수신', frame.headers);
  clearConnectTimer();
  status = 'connected';
  reconnectAttempt = 0;
  didRetryWithNewToken = false;
  startHeartBeat(frame.headers['heart-beat']);

  subscriptions.forEach(subscription => {
    if (!subscription.sent) {
      subscribeOnServer(subscription);
    }
  });
}

function handleMessage(frame: StompFrame) {
  const subscription = subscriptions.get(frame.headers.subscription ?? '');
  if (subscription === undefined) {
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(frame.body);
  } catch {
    // 규약을 벗어난 본문이다. 구독자에게 반쪽 값을 넘기느니 흘린다.
    return;
  }

  subscription.handler(payload as never);
}

/**
 * 서버가 연결을 거부했다. 액세스 토큰이 메모리에만 있어 앱을 다시 켠 직후에는
 * 만료 상태일 수 있으므로, 연결당 한 번은 재발급을 받아 다시 붙어 본다.
 */
function handleError() {
  log('ERROR 프레임 수신', { didRetryWithNewToken });
  // 이미 새 토큰으로 붙어 봤는데 또 거절당했다. 토큰 문제가 아니거나 아직
  // 안 풀린 것이라 재발급을 반복하지 않고, 간격을 늘려 가며 다시 붙기만 한다.
  if (didRetryWithNewToken) {
    reconnect();
    return;
  }

  didRetryWithNewToken = true;
  closeSocket();
  refreshAccessToken().then(result => {
    if (result === 'success' && subscriptions.size > 0) {
      openSocket();
      return;
    }
    // 재발급이 안 됐으면 붙어 봐야 같은 이유로 거절당한다.
    scheduleReconnect();
  });
}

function handleFrame(frame: StompFrame) {
  switch (frame.command) {
    case 'CONNECTED':
      handleConnected(frame);
      return;
    case 'MESSAGE':
      handleMessage(frame);
      return;
    case 'ERROR':
      handleError();
      return;
    default:
      // RECEIPT는 우리가 receipt를 요청하지 않아 올 일이 없다.
      return;
  }
}

function handleData(chunk: string) {
  lastReceivedAt = Date.now();

  const { frames, rest } = decodeFrames(buffer + chunk);
  buffer = rest;
  frames.forEach(handleFrame);
}

function closeSocket() {
  stopTimers();
  buffer = '';
  status = 'idle';

  if (socket === null) {
    return;
  }

  // 우리가 닫는 것이므로 재연결 경로를 타지 않게 콜백을 먼저 떼어낸다.
  socket.onopen = null;
  socket.onmessage = null;
  socket.onclose = null;
  socket.onerror = null;
  socket.close();
  socket = null;
}

function scheduleReconnect() {
  if (subscriptions.size === 0 || reconnectTimer !== null) {
    return;
  }

  const delay = Math.min(
    RECONNECT_MAX_DELAY_MS,
    RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
  );
  reconnectAttempt += 1;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (subscriptions.size > 0) {
      openSocket();
    }
  }, delay);
}

function reconnect() {
  closeSocket();
  scheduleReconnect();
}

/** 연결이 끊기면 구독은 서버에 남지 않는다. 다시 붙을 때 전부 다시 보낸다. */
function markAllUnsent() {
  subscriptions.forEach(subscription => {
    subscription.sent = false;
  });
}

function openSocket() {
  if (socket !== null) {
    return;
  }

  markAllUnsent();
  status = 'connecting';
  buffer = '';
  lastReceivedAt = Date.now();

  const url = resolveSocketUrl();
  log('연결 시도', url);
  const created = new WebSocket(url, SUB_PROTOCOLS);
  socket = created;

  created.onopen = () => {
    log('소켓 열림', {
      protocol: (created as { protocol?: string }).protocol ?? '(없음)',
    });
    sendConnectFrame();
  };
  created.onmessage = event => handleData(String(event.data));
  created.onclose = event => {
    // 서버나 네트워크가 끊었다. 구독이 남아 있으면 다시 붙는다.
    log('소켓 닫힘', { code: event?.code, reason: event?.reason });
    socket = null;
    stopTimers();
    status = 'idle';
    scheduleReconnect();
  };
  // onerror 뒤에는 항상 onclose가 따라와서 재연결은 그쪽 한 곳에서만 건다.
  created.onerror = event => {
    log('소켓 에러', event?.message);
  };
}

function disconnect() {
  if (socket !== null && socket.readyState === OPEN) {
    sendFrame({ command: 'DISCONNECT', headers: {}, body: '' });
  }

  closeSocket();
  reconnectAttempt = 0;
  didRetryWithNewToken = false;
}

/**
 * 토픽을 구독한다. 구독이 여러 개여도 소켓은 하나이고, 마지막 구독이 해지되면
 * 소켓을 닫는다.
 *
 * 연결 전에 불러도 된다 — 구독을 기억해 뒀다가 CONNECTED를 받는 순간 보낸다.
 * 중간에 연결이 끊겼다 붙어도 살아 있는 구독은 자동으로 다시 신청된다.
 */
export function subscribeStompTopic<T>(
  destination: string,
  handler: (message: T) => void,
): StompSubscription {
  nextSubscriptionId += 1;
  const id = `sub-${nextSubscriptionId}`;

  let markReady = () => {};
  const ready = new Promise<void>(resolve => {
    markReady = resolve;
  });

  const subscription: Subscription = {
    id,
    destination,
    handler: handler as (message: never) => void,
    sent: false,
    markReady,
  };
  subscriptions.set(id, subscription);

  if (status === 'connected') {
    subscribeOnServer(subscription);
  } else {
    openSocket();
  }

  let active = true;

  return {
    ready,
    unsubscribe: () => {
      // 같은 구독을 두 번 해지해도 남의 구독을 지우면 안 된다.
      if (!active) {
        return;
      }
      active = false;
      subscriptions.delete(id);
      // 구독이 붙기 전에 화면을 떠났다. 기다리던 쪽이 영영 매달리지 않게 푼다.
      markReady();

      if (subscription.sent && status === 'connected') {
        sendFrame({ command: 'UNSUBSCRIBE', headers: { id }, body: '' });
      }

      if (subscriptions.size === 0) {
        disconnect();
      }
    },
  };
}
