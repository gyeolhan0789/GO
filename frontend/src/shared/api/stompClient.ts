// 서버가 쏘는 토픽을 구독하는 STOMP 클라이언트. 소켓 하나를 모든 구독이
// 나눠 쓰고, 마지막 구독이 해지되면 닫는다.
//
// 백엔드는 `enableSimpleBroker("/topic")`만 열어 둔 **구독 전용**이다
// (setApplicationDestinationPrefixes가 없어 클라이언트가 서버로 보낼 수 있는
// 목적지가 없다). 그래서 여기에도 send/publish를 두지 않는다.

import {
  decodeFrames,
  encodeFrame,
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
};

export type StompSubscription = {
  unsubscribe: () => void;
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
}

function sendRaw(payload: string) {
  if (socket !== null && socket.readyState === OPEN) {
    socket.send(payload);
  }
}

function sendFrame(frame: StompFrame) {
  sendRaw(encodeFrame(frame));
}

/**
 * RN의 WebSocket은 핸드셰이크에 커스텀 헤더를 싣지 못한다. 그래서 인증을
 * HTTP 헤더가 아니라 CONNECT 프레임의 Authorization으로 보낸다 — 백엔드의
 * WebSocketAuthenticationInterceptor도 CONNECT에서만 토큰을 읽는다.
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
}

function subscribeOnServer(subscription: Subscription) {
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

  const created = new WebSocket(resolveSocketUrl());
  socket = created;

  created.onopen = () => sendConnectFrame();
  created.onmessage = event => handleData(String(event.data));
  created.onclose = () => {
    // 서버나 네트워크가 끊었다. 구독이 남아 있으면 다시 붙는다.
    socket = null;
    stopTimers();
    status = 'idle';
    scheduleReconnect();
  };
  // onerror 뒤에는 항상 onclose가 따라와서 재연결은 그쪽 한 곳에서만 건다.
  created.onerror = () => {};
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
  const subscription: Subscription = {
    id,
    destination,
    handler: handler as (message: never) => void,
    sent: false,
  };
  subscriptions.set(id, subscription);

  if (status === 'connected') {
    subscribeOnServer(subscription);
  } else {
    openSocket();
  }

  let active = true;

  return {
    unsubscribe: () => {
      // 같은 구독을 두 번 해지해도 남의 구독을 지우면 안 된다.
      if (!active) {
        return;
      }
      active = false;
      subscriptions.delete(id);

      if (subscription.sent && status === 'connected') {
        sendFrame({ command: 'UNSUBSCRIBE', headers: { id }, body: '' });
      }

      if (subscriptions.size === 0) {
        disconnect();
      }
    },
  };
}
