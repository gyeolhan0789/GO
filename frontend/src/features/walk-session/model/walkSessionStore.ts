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

import type { SamsungHealthSummary } from '../../../shared/lib/samsungHealth';

type Listener = () => void;

type WalkSessionState = {
  roomId: number | null;
  /** null이면 방은 배정됐지만 시작 카운트다운이 아직 안 끝난 상태다.
   * 이 동안은 경과 시간이 세지지 않고(getWalkSessionElapsedSeconds가 0을
   * 반환) 헬스 기준값도 아직 안 읽는다 — confirmWalkSessionStart가 실제
   * 시작 시각을 채우는 시점에 둘 다 시작된다. */
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  /** 세션 시작 시점의 오늘 누적 걸음/거리/칼로리(기준값). 이 세션에서만
   * 걷고 쓴 양을 보여주려면 나중 값에서 이 값을 뺀다. 조회 실패/미허용이면
   * null로 남고, 화면 쪽이 오늘 누적치를 그대로 보여주는 걸로 대체한다. */
  startHealthSummary: SamsungHealthSummary | null;
};

let state: WalkSessionState = {
  roomId: null,
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  startHealthSummary: null,
};
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(listener => listener());
}

/** 이미 방이 배정돼 있으면(카운트다운 중이든 이미 시작했든) 건드리지
 * 않는다(중복 시작 방지). 실제 시작 시각은 아직 안 채운다 — 화면의 시작
 * 카운트다운이 끝나야 confirmWalkSessionStart로 채워진다. */
export function startWalkSession(roomId: number) {
  if (state.roomId !== null) {
    return;
  }
  state = {
    roomId,
    startedAt: null,
    pausedAt: null,
    pausedMs: 0,
    startHealthSummary: null,
  };
  notify();
}

/** 시작 카운트다운이 끝나거나 건너뛴 시점에 호출한다. 이 순간을 진짜
 * 시작 시각으로 기록한다. 걸음 기준값은 여기서 한 번만 읽지 않고
 * setWalkSessionStartHealthSummary로 화면의 정기 폴링 결과 중 처음
 * 성공한 값을 쓴다(단발성 조회는 실패해도 재시도가 없어, 실패하면
 * 세션 내내 기준값이 null로 남아 "세션 걸음"이 그날 누적 걸음처럼
 * 보이는 문제가 있었다). */
export function confirmWalkSessionStart() {
  if (state.roomId === null || state.startedAt !== null) {
    return;
  }
  state = { ...state, startedAt: Date.now() };
  notify();
}

/** 화면의 정기 폴링(useSamsungHealthToday)이 처음 성공했을 때 그 값을
 * 이번 세션의 걸음 기준값으로 등록한다. 이미 등록돼 있으면 무시한다 —
 * 나중 값으로 덮어쓰면 그 사이 걸은 만큼이 기준에 섞여 세션 걸음수가
 * 줄어드는 것처럼 보인다. */
export function setWalkSessionStartHealthSummary(summary: SamsungHealthSummary) {
  if (state.startedAt === null || state.startHealthSummary !== null) {
    return;
  }
  state = { ...state, startHealthSummary: summary };
  notify();
}

export function endWalkSession() {
  state = {
    roomId: null,
    startedAt: null,
    pausedAt: null,
    pausedMs: 0,
    startHealthSummary: null,
  };
  notify();
}

export function getWalkSessionRoomId() {
  return state.roomId;
}

export function getWalkSessionStartHealthSummary() {
  return state.startHealthSummary;
}

/** 시작 카운트다운이 끝나 실제로 경과 시간이 세지고 있는지. */
export function isWalkSessionStarted() {
  return state.startedAt !== null;
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

/** 방이 배정돼 있으면(카운트다운 중이어도) 활성 세션으로 취급한다 —
 * 홈 화면에서 "이미 진행 중이면 바로 이어서" 판단에 쓴다. */
export function isWalkSessionActive() {
  return state.roomId !== null;
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
