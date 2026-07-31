// 화면(WalkSessionScreen) 마운트 여부와 무관하게 살아있는 산책 세션 상태.
// 뒤로가기로 화면을 나갔다 들어와도 경과 시간이 0으로 리셋되지 않도록,
// 시작 시각을 기준으로 매번 다시 계산한다.
//
// 지금은 앱 프로세스가 떠있는 동안만 유지되는 모듈 싱글턴이다. 나중에
// 포그라운드 서비스/잠금화면 알림이 생기면 그쪽이 진짜 상태의 주인이 되고,
// 이 모듈은 그 값을 구독하는 쪽으로 바뀌면 된다 — 아래 구독 인터페이스
// (subscribeWalkSession + get 함수들)는 그대로 유지할 수 있게 설계했다.
// 시작 시각도 지금은 화면 진입 시점을 쓰지만, 실제로는 방(room)의
// startedAt을 그대로 써야 한다.

import {
  readSamsungHealthToday,
  type SamsungHealthSummary,
} from '../../../shared/lib/samsungHealth';

type Listener = () => void;

type WalkSessionState = {
  roomId: number | null;
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  /** 세션 시작 시점의 오늘 누적 걸음/거리/칼로리(기준값). 이 세션에서만
   * 걷고 쓴 양을 보여주려면 나중 값에서 이 값을 뺀다. 조회 실패/미허용이면
   * null로 남고, 화면 쪽이 오늘 누적치를 그대로 보여주는 걸로 대체한다. */
  startHealthSummary: SamsungHealthSummary | null;
  /** 시작 카운트다운을 이미 보여줬는지. 화면 마운트 기준으로 두면 뒤로가기
   * 후 재진입할 때마다 다시 떠서, 세션 단위(이 상태)로 한 번만 보여준다. */
  hasShownCountdown: boolean;
};

let state: WalkSessionState = {
  roomId: null,
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  startHealthSummary: null,
  hasShownCountdown: false,
};
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(listener => listener());
}

/** 이미 진행 중인 세션이 있으면 건드리지 않는다(중복 시작 방지). */
export function startWalkSession(roomId: number) {
  if (state.startedAt !== null) {
    return;
  }
  const startedAt = Date.now();
  state = {
    roomId,
    startedAt,
    pausedAt: null,
    pausedMs: 0,
    startHealthSummary: null,
    hasShownCountdown: false,
  };
  notify();

  readSamsungHealthToday().then(summary => {
    // 그 사이 세션이 끝났거나 다른 세션이 새로 시작됐으면 이 기준값은 버린다.
    if (state.startedAt !== startedAt || summary === null) {
      return;
    }
    state = { ...state, startHealthSummary: summary };
    notify();
  });
}

export function endWalkSession() {
  state = {
    roomId: null,
    startedAt: null,
    pausedAt: null,
    pausedMs: 0,
    startHealthSummary: null,
    hasShownCountdown: false,
  };
  notify();
}

export function getWalkSessionRoomId() {
  return state.roomId;
}

export function getWalkSessionStartHealthSummary() {
  return state.startHealthSummary;
}

export function getWalkSessionHasShownCountdown() {
  return state.hasShownCountdown;
}

/** 시작 카운트다운을 다 보여줬거나 건너뛰었을 때 한 번만 호출한다. */
export function markWalkSessionCountdownShown() {
  if (state.hasShownCountdown) {
    return;
  }
  state = { ...state, hasShownCountdown: true };
  notify();
}

export function togglePauseWalkSession() {
  if (state.startedAt === null) {
    return;
  }
  if (state.pausedAt !== null) {
    state = {
      ...state,
      pausedMs: state.pausedMs + (Date.now() - state.pausedAt),
      pausedAt: null,
    };
  } else {
    state = { ...state, pausedAt: Date.now() };
  }
  notify();
}

export function isWalkSessionActive() {
  return state.startedAt !== null;
}

export function isWalkSessionPaused() {
  return state.pausedAt !== null;
}

export function getWalkSessionElapsedSeconds() {
  if (state.startedAt === null) {
    return 0;
  }
  const pausedTotalMs =
    state.pausedMs + (state.pausedAt !== null ? Date.now() - state.pausedAt : 0);
  return Math.max(
    0,
    Math.floor((Date.now() - state.startedAt - pausedTotalMs) / 1000),
  );
}

export function subscribeWalkSession(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
