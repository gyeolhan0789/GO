// 화면(WalkSessionScreen) 마운트 여부와 무관하게 살아있는 산책 세션 상태의
// JS 쪽 캐시. 진짜 소유자는 네이티브 WalkForegroundService다 — 이 모듈은
// 그 상태를 하이드레이션/구독해서 반영만 하고, 시작/일시정지/재개/종료는
// 전부 네이티브 호출로 위임한다. 구독 인터페이스(subscribeWalkSession +
// get 함수들)는 예전 순수 JS 구현 때와 시그니처를 그대로 유지한다.

import type { Gender } from '../../auth/constants/genders';
import { getActiveBingoBoard } from '../../bingo/api/bingoApi';
import {
  getWalkTrackingSnapshot,
  pauseWalkTrackingSession,
  resumeWalkTrackingSession,
  startWalkTrackingSession,
  stopWalkTrackingSession,
  subscribeWalkTrackingState,
  type WalkSessionSnapshot,
} from '../../../shared/lib/walkTracking';
import { startWalkSessionOnServer } from '../api/walkSessionApi';
import {
  readActiveWalkSession,
  writeActiveWalkSession,
} from './activeSessionStorage';

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
  /** 끊기지 않고 이어지는 현재 RUNNING 구간이 시작된 시각. 일시정지하거나
   * 세션이 끝나면 null이 된다 — "연속 N분/N걸음" 미션 판정에 쓴다. */
  runningSinceAt: number | null;
  /** runningSinceAt 시점의 누적 걸음 수. steps - continuousStepsBase가 이번
   * 연속 구간에서 걸은 걸음 수다. */
  continuousStepsBase: number;
  /** 워치에서 "산책 종료"를 눌렀을 때 선다. 기록 저장·결과 화면 이동은
   * WalkSessionScreen만 할 수 있어서(저장할 수치와 방 정보를 그 화면이
   * 들고 있다), 여기서는 요청만 남기고 화면이 마운트되면 이어받는다. */
  endRequested: boolean;
  /** 서버가 발급한 세션 키. 미션 제출을 이 산책에 귀속시키는 데 쓴다. 종료
   * 흐름은 이 값이 아니라 activeSessionStorage를 읽는다 — 네이티브 세션을
   * 멈추는 순간 이 상태가 IDLE로 돌아가기 때문이다. */
  walkSessionKey: string | null;
};

const IDLE_STATE: WalkSessionState = {
  roomId: null,
  startedAt: null,
  pausedAt: null,
  pausedMs: 0,
  steps: 0,
  distanceMeters: 0,
  calories: 0,
  runningSinceAt: null,
  continuousStepsBase: 0,
  endRequested: false,
  walkSessionKey: null,
};

let state: WalkSessionState = { ...IDLE_STATE };
const listeners = new Set<Listener>();

/**
 * 서버 세션 발급이 진행 중이면 그 약속. 카운트다운이 끝나자마자 빙고판으로
 * 달려가 미션을 제출하면 아직 키가 없을 수 있어서, 제출 쪽이 이걸 기다린다.
 */
let keyPromise: Promise<string | null> | null = null;

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
  const isRunning = snapshot.status === 'RUNNING';
  // 직전 상태가 일시정지/미시작이었는데 지금 RUNNING이면 새 연속 구간이
  // 시작된 것이다 — 이번 스냅샷의 값을 그 구간의 기준점으로 잡는다.
  const wasRunning = state.startedAt !== null && state.pausedAt === null;
  const continuousStartedNow = isRunning && !wasRunning;
  state = {
    roomId: snapshot.roomId,
    startedAt: snapshot.startedAt,
    pausedAt: snapshot.status === 'PAUSED' ? now : null,
    pausedMs: Math.max(0, now - snapshot.startedAt - snapshot.activeElapsedMs),
    steps: snapshot.steps,
    distanceMeters: snapshot.distanceMeters,
    calories: snapshot.calories,
    runningSinceAt: isRunning ? (continuousStartedNow ? now : state.runningSinceAt) : null,
    continuousStepsBase: isRunning
      ? continuousStartedNow
        ? snapshot.steps
        : state.continuousStepsBase
      : snapshot.steps,
    // 네이티브 스냅샷에는 없는 값이라 그대로 이어간다. 워치가 종료를 눌러둔
    // 사이에 스냅샷이 와도 요청이 사라지면 안 된다(세션이 IDLE이 되면 위에서
    // IDLE_STATE로 초기화되면서 자연히 내려간다).
    endRequested: state.endRequested,
    walkSessionKey: state.walkSessionKey,
  };
  notify();
}

/**
 * 서버에 산책 세션을 열고 키를 받아 기기에 저장한다. 실패해도 산책 자체는
 * 그대로 진행된다 — 키가 없으면 종료할 때 그날 걸음 합계만 따로 올린다.
 */
async function issueWalkSessionKey(roomId: number): Promise<string | null> {
  try {
    // 이 산책이 어느 판에서 시작했는지 남겨두면, 미션을 하나도 못 깨도 상세에
    // 그날의 빙고판이 나온다. 판을 못 읽어도 시작 자체를 막지는 않는다.
    const board = await getActiveBingoBoard(roomId).catch(() => null);
    const response = await startWalkSessionOnServer({
      roomId,
      bingoBoardId: board?.bingoBoardId,
    });

    // 서버에 아직 안 끝난 다른 방 세션이 남아 있으면 요청한 방을 무시하고 그걸
    // 돌려준다. 그 키로 이번 산책을 기록하면 엉뚱한 방의 기록이 되므로 쓰지
    // 않는다 — 세션을 버리는 API가 없어 24시간 만료를 기다리는 수밖에 없다.
    if (response.roomId !== roomId) {
      return null;
    }
    // 발급을 기다리는 사이 사용자가 산책을 접고 다른 방으로 갔을 수 있다.
    if (state.roomId !== roomId) {
      return null;
    }

    await writeActiveWalkSession({
      walkSessionKey: response.walkSessionKey,
      roomId: response.roomId,
      expiresAt: response.expiresAt,
      // 종료 요청에 함께 실으려고 남긴다. 시작 시각은 서버가 찍은 값이라
      // 기기 시계로 다시 만들면 서버 기록과 어긋난다.
      startedAt: response.startedAt,
      bingoBoardId: response.initialBingoBoardId,
    });
    state = { ...state, walkSessionKey: response.walkSessionKey };
    notify();
    return response.walkSessionKey;
  } catch {
    return null;
  }
}

/**
 * 저장해둔 키가 지금 돌고 있는 네이티브 세션과 짝이 맞는지 판정한다. 둘의
 * 생명주기가 달라서(네이티브는 앱을 지우면 사라지고, 서버 세션은 24시간 남는다)
 * 단순 복구가 아니라 대조가 필요하다.
 */
async function hydrateWalkSessionKey(snapshot: WalkSessionSnapshot) {
  if (snapshot.status === 'IDLE' || snapshot.roomId === null) {
    // 돌고 있는 산책이 없다. 저장된 키는 아직 못 끝낸 산책의 것일 수 있어
    // 지우지 않는다.
    return;
  }

  const stored = await readActiveWalkSession();
  if (stored !== null && stored.roomId === snapshot.roomId) {
    state = { ...state, walkSessionKey: stored.walkSessionKey };
    notify();
    return;
  }

  // 키가 없거나 다른 방 것이다. 서버는 활성 세션이 있으면 그대로 돌려주므로,
  // 다시 시작을 요청하면 원래 키를 되찾을 수 있다. 앱 시작을 막지 않도록
  // 여기서 기다리지 않는다.
  keyPromise = issueWalkSessionKey(snapshot.roomId);
}

/**
 * 미션 제출처럼 키가 꼭 필요한 곳에서 부른다. 발급 중이면 끝날 때까지만
 * 기다리고, 산책 중이 아니면 곧바로 null이다.
 *
 * roomId를 받는 건 지금 걷고 있는 방의 빙고판인지 확인하기 위해서다. 서버는
 * 제출할 때 키와 방이 맞는지 보지 않고 나중에 종료할 때야 대조하는데, 거기서
 * 어긋나면 그 산책이 통째로 기록에 안 남는다. 다른 방 판에서 낸 인증은 이
 * 산책에 붙이지 않는다.
 */
export function awaitWalkSessionKey(roomId: number): Promise<string | null> {
  if (state.roomId !== roomId) {
    return Promise.resolve(null);
  }
  return keyPromise ?? Promise.resolve(state.walkSessionKey);
}

// 네이티브가 상태를 바꿀 때마다(알림 버튼 포함) 오는 이벤트를 반영한다.
// 모듈이 처음 임포트되는 시점에 한 번만 구독한다.
subscribeWalkTrackingState(applySnapshot);

/** 앱 시작 시 한 번 호출해 네이티브의 현재 세션 상태로 캐시를 맞춘다(강제
 * 종료 후 재실행/서비스 복구 케이스 포함). */
export async function hydrateWalkSessionFromNative(): Promise<void> {
  const snapshot = await getWalkTrackingSnapshot();
  applySnapshot(snapshot);
  await hydrateWalkSessionKey(snapshot);
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
  // 서버 세션 발급은 기다리지 않는다 — 카운트다운이 끝난 순간 화면이 멈추면
  // 안 된다. 키가 꼭 필요한 미션 제출만 awaitWalkSessionKey로 기다린다.
  keyPromise = issueWalkSessionKey(roomId);
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
  keyPromise = null;
  notify();
}

/** 네이티브 세션을 종료하고 최종 수치를 받아온다. 서비스/알림/위치 추적을
 * 정지시키고 로컬 캐시도 IDLE로 되돌린다.
 *
 * 저장해둔 세션 키는 지우지 않는다 — 아직 서버에 종료를 알리기 전이라,
 * 그 키가 있어야 이 산책이 기록으로 남는다. */
export async function stopWalkSession(): Promise<WalkSessionSnapshot> {
  const snapshot = await stopWalkTrackingSession();
  state = { ...IDLE_STATE };
  keyPromise = null;
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

/** 마지막으로 끊기지 않고 이어지는 RUNNING 구간에서 걸은 걸음 수. 일시정지
 * 중이거나 세션이 없으면 0이다. */
export function getWalkSessionContinuousSteps() {
  if (state.runningSinceAt === null) {
    return 0;
  }
  return Math.max(0, state.steps - state.continuousStepsBase);
}

/** 마지막으로 끊기지 않고 이어지는 RUNNING 구간의 경과 시간(ms). 일시정지
 * 중이거나 세션이 없으면 0이다. */
export function getWalkSessionContinuousActiveMs() {
  if (state.runningSinceAt === null) {
    return 0;
  }
  return Math.max(0, Date.now() - state.runningSinceAt);
}

export function subscribeWalkSession(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
