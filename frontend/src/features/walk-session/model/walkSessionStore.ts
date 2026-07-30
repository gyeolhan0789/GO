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

type Listener = () => void;

type WalkSessionState = {
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
};

let state: WalkSessionState = { startedAt: null, pausedAt: null, pausedMs: 0 };
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(listener => listener());
}

/** 이미 진행 중인 세션이 있으면 건드리지 않는다(중복 시작 방지). */
export function startWalkSession() {
  if (state.startedAt !== null) {
    return;
  }
  state = { startedAt: Date.now(), pausedAt: null, pausedMs: 0 };
  notify();
}

export function endWalkSession() {
  state = { startedAt: null, pausedAt: null, pausedMs: 0 };
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
