// 화면(WalkSessionScreen) 마운트 여부와 무관하게 살아있는 산책 세션 상태의
// JS 쪽 캐시. 진짜 소유자는 네이티브 WalkForegroundService다 — 이 모듈은
// 그 상태를 하이드레이션/구독해서 반영만 하고, 시작/일시정지/재개/종료는
// 전부 네이티브 호출로 위임한다. 구독 인터페이스(subscribeWalkSession +
// get 함수들)는 예전 순수 JS 구현 때와 시그니처를 그대로 유지한다.

import type { Gender } from '../../auth/constants/genders';
import {
  getWalkTrackingSnapshot,
  pauseWalkTrackingSession,
  resumeWalkTrackingSession,
  startWalkTrackingSession,
  stopWalkTrackingSession,
  subscribeWalkTrackingState,
  type WalkSessionSnapshot,
} from '../../../shared/lib/walkTracking';

type Listener = () => void;

type WalkSessionState = {
  roomId: number | null;
  /** null이면 방은 배정됐지만 시작 카운트다운이 아직 안 끝난 상태다(네이티브
   * 세션은 아직 시작 전). confirmWalkSessionStart가 네이티브 세션을 실제로
   * 시작시키는 시점에 채워진다. */
  startedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  steps: number;
  distanceMeters: number;
  calories: number;
  /** 워치에서 "산책 종료"를 눌렀을 때 선다. 기록 저장·결과 화면 이동은
   * WalkSessionScreen만 할 수 있어서(저장할 수치와 방 정보를 그 화면이
   * 들고 있다), 여기서는 요청만 남기고 화면이 마운트되면 이어받는다. */
  endRequested: boolean;
};

const IDLE_STATE: WalkSessionState = {
  roomId: null,
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  steps: 0,
  distanceMeters: 0,
  calories: 0,
  endRequested: false,
};

let state: WalkSessionState = { ...IDLE_STATE };
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(listener => listener());
}

/**
 * 네이티브 스냅샷(status/activeElapsedMs)을 스토어의 startedAt/pausedAt/pausedMs
 * 표현으로 역산해 반영한다. getWalkSessionElapsedSeconds()의 계산식은 그대로
 * 두고, 그 계산식이 기대하는 입력값만 네이티브 기준으로 재구성하는 방식이다 —
 * 이렇게 하면 반영 시점의 activeElapsedMs와 정확히 일치하고, 이후 RUNNING이면
 * 매초 자연스럽게 흐르고 PAUSED면 그대로 고정된다.
 */
function applySnapshot(snapshot: WalkSessionSnapshot) {
  if (snapshot.status === 'IDLE' || snapshot.startedAt === null) {
    state = { ...IDLE_STATE };
    notify();
    return;
  }
  const now = Date.now();
  state = {
    roomId: snapshot.roomId,
    startedAt: snapshot.startedAt,
    pausedAt: snapshot.status === 'PAUSED' ? now : null,
    pausedMs: Math.max(0, now - snapshot.startedAt - snapshot.activeElapsedMs),
    steps: snapshot.steps,
    distanceMeters: snapshot.distanceMeters,
    calories: snapshot.calories,
    // 네이티브 스냅샷에는 없는 값이라 그대로 이어간다. 워치가 종료를 눌러둔
    // 사이에 스냅샷이 와도 요청이 사라지면 안 된다(세션이 IDLE이 되면 위에서
    // IDLE_STATE로 초기화되면서 자연히 내려간다).
    endRequested: state.endRequested,
  };
  notify();
}

// 네이티브가 상태를 바꿀 때마다(알림 버튼 포함) 오는 이벤트를 반영한다.
// 모듈이 처음 임포트되는 시점에 한 번만 구독한다.
subscribeWalkTrackingState(applySnapshot);

/** 앱 시작 시 한 번 호출해 네이티브의 현재 세션 상태로 캐시를 맞춘다(강제
 * 종료 후 재실행/서비스 복구 케이스 포함). */
export async function hydrateWalkSessionFromNative(): Promise<void> {
  const snapshot = await getWalkTrackingSnapshot();
  applySnapshot(snapshot);
}

/** 이미 방이 배정돼 있으면(카운트다운 중이든 이미 시작했든) 건드리지
 * 않는다(중복 시작 방지). 네이티브 세션은 아직 시작하지 않는다 — 화면의
 * 시작 카운트다운이 끝나야 confirmWalkSessionStart로 실제 시작된다. */
export function startWalkSession(roomId: number) {
  if (state.roomId !== null) {
    return;
  }
  state = { ...IDLE_STATE, roomId };
  notify();
}

/** 시작 카운트다운이 끝나거나 건너뛴 시점에 호출한다. 네이티브 세션을 실제로
 * 시작시킨다(GPS·걸음수·칼로리·알림의 진짜 시작). 성별은 기기 걸음 센서
 * 폴백일 때 거리·칼로리 추정에 쓰인다. */
export function confirmWalkSessionStart(gender: Gender | null) {
  if (state.roomId === null || state.startedAt !== null) {
    return;
  }
  const roomId = state.roomId;
  startWalkTrackingSession(roomId, gender)
    .then(applySnapshot)
    .catch(() => {});
}

/** 워치의 "산책 종료"가 도착했을 때. 실제 종료는 WalkSessionScreen이 한다. */
export function requestWalkSessionEnd() {
  if (state.roomId === null || state.endRequested) {
    return;
  }
  state = { ...state, endRequested: true };
  notify();
}

export function isWalkSessionEndRequested() {
  return state.endRequested;
}

/** 종료 흐름을 시작한 화면이 요청을 소비한다(같은 요청을 두 번 타지 않게). */
export function clearWalkSessionEndRequest() {
  if (!state.endRequested) {
    return;
  }
  state = { ...state, endRequested: false };
  notify();
}

export function togglePauseWalkSession() {
  if (state.startedAt === null) {
    return;
  }
  const action = state.pausedAt !== null ? resumeWalkTrackingSession : pauseWalkTrackingSession;
  action().then(applySnapshot).catch(() => {});
}

/** 로컬 캐시만 즉시 초기화한다(네이티브 세션은 건드리지 않음). roomId가 아예
 * 없어 네이티브에 시작한 적도 없는 경우(카운트다운 중 뒤로가기 등)에만 쓴다.
 * 실제 종료(네이티브 정지 + 최종 수치 확정)는 stopWalkSession을 쓴다. */
export function endWalkSession() {
  state = { ...IDLE_STATE };
  notify();
}

/** 네이티브 세션을 종료하고 최종 수치를 받아온다. 서비스/알림/위치 추적을
 * 정지시키고 로컬 캐시도 IDLE로 되돌린다. */
export async function stopWalkSession(): Promise<WalkSessionSnapshot> {
  const snapshot = await stopWalkTrackingSession();
  state = { ...IDLE_STATE };
  notify();
  return snapshot;
}

export function getWalkSessionRoomId() {
  return state.roomId;
}

/** 시작 카운트다운이 끝나 실제로 경과 시간이 세지고 있는지. */
export function isWalkSessionStarted() {
  return state.startedAt !== null;
}

/** 방이 배정돼 있으면(카운트다운 중이어도) 활성 세션으로 취급한다 —
 * 홈 화면에서 "이미 진행 중이면 바로 이어서" 판단에 쓴다. */
export function isWalkSessionActive() {
  return state.roomId !== null;
}

export function isWalkSessionPaused() {
  return state.pausedAt !== null;
}

/**
 * 내림하지 않은 경과 밀리초. 워치로 보낼 때 쓴다 — 초로 넘기면 폰이 내림한 값에
 * 워치가 자기 경과분을 또 내림해 더해서, 두 화면이 1초쯤 어긋난다.
 */
export function getWalkSessionElapsedMs() {
  if (state.startedAt === null) {
    return 0;
  }
  const pausedTotalMs =
    state.pausedMs + (state.pausedAt !== null ? Date.now() - state.pausedAt : 0);
  return Math.max(0, Date.now() - state.startedAt - pausedTotalMs);
}

export function getWalkSessionElapsedSeconds() {
  return Math.floor(getWalkSessionElapsedMs() / 1000);
}

export function getWalkSessionSteps() {
  return state.steps;
}

export function getWalkSessionDistanceMeters() {
  return state.distanceMeters;
}

export function getWalkSessionCalories() {
  return state.calories;
}

export function subscribeWalkSession(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
