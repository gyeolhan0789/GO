import { ApiError } from '../../../shared/api/ApiError';
import { toIsoDate } from '../../../shared/lib/isoDate';
import { reportStepsToLedger } from '../../../shared/lib/stepLedgerSync';
import {
  completeWalkSession,
  type WalkSessionCompleteRequest,
  type WalkSessionCompleteResponse,
} from '../api/walkSessionApi';
import {
  clearActiveWalkSession,
  readActiveWalkSession,
} from './activeSessionStorage';
import { stopWalkSession } from './walkSessionStore';

export type FinishedWalk = {
  roomId: number;
  /** 네이티브 세션을 멈춘 시각. 재시도해도 이 값을 다시 찍으면 안 된다. */
  endedAt: Date;
  /** 일시정지를 뺀 실제 운동 시간(초). */
  activeDurationSeconds: number;
  step: number;
  /** 미터. */
  distance: number;
  calories: number;
};

export type RecordFinishedWalkResult =
  /** 산책 기록으로 남았다. 그날 걸음 합계는 서버가 같이 처리한다. */
  | { status: 'recorded'; walkSession: WalkSessionCompleteResponse }
  /** 못 올렸다. 이 산책은 기록에도, 그날 걸음 합계에도 들어가지 않는다. */
  | { status: 'failed'; message: string };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.';
}

/**
 * 걸은 시간을 서버가 볼 창(`endedAt - startedAt`) 안으로 깎는다.
 *
 * 서버는 `activeDurationSeconds`가 그 창보다 크면 400(INVALID_INPUT)으로 거절해
 * 산책 기록이 통째로 날아간다. 그런데 두 값의 출처가 다르다 — 걸은 시간은
 * 네이티브 세션이 시작한 순간부터 재는데, `startedAt`은 그보다 늦게 찍힌다.
 * `confirmWalkSessionStart`가 네이티브를 먼저 켜고 서버 세션 발급은 기다리지
 * 않으며, 그 발급은 빙고판 조회까지 거쳐 왕복 두 번 뒤에야 서버에 도달한다.
 * 그 지연만큼 걸은 시간이 창을 넘어서, 네트워크가 느린 순간에만 기록이 거절됐다.
 *
 * 서버가 쓸 계산을 그대로 다시 해서 맞춰 보낸다. 깎이는 건 그 왕복 지연분이다.
 */
function clampToServerWindow(
  activeDurationSeconds: number,
  startedAt: string | undefined,
  endedAt: string,
): number {
  // 이 변경 전에 시작한 산책은 startedAt이 없다. 그때는 서버가 자기 값으로
  // 창을 잡으므로 우리가 깎을 근거가 없다.
  if (startedAt === undefined) {
    return activeDurationSeconds;
  }

  const windowMs = Date.parse(endedAt) - Date.parse(startedAt);
  if (Number.isNaN(windowMs)) {
    return activeDurationSeconds;
  }

  // 기기 시계가 서버보다 뒤처져 있으면 창이 음수로 나온다. 음수를 보내면 그것도
  // 거절당하므로 0으로 막는다.
  return Math.min(activeDurationSeconds, Math.max(0, Math.floor(windowMs / 1000)));
}

/**
 * 완료 요청은 같은 walkSessionKey에 멱등이다. 그래서 응답을 못 받은 경우에는
 * 다시 보내도 안전하다 — 서버가 이미 만들어둔 기록을 그대로 돌려준다.
 */
async function completeWithRetry(
  body: WalkSessionCompleteRequest,
): Promise<WalkSessionCompleteResponse> {
  try {
    return await completeWalkSession(body);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    return completeWalkSession(body);
  }
}

/**
 * 끝난 산책을 서버에 올린다.
 *
 * 걸음·거리·칼로리는 이 요청 하나로만 보낸다. 서버가 완료 처리 안에서 그날
 * 걸음 합계까지 누적하므로, /histories를 따로 부르면 같은 걸음이 두 번 더해진다.
 */
export async function recordFinishedWalk(
  walk: FinishedWalk,
): Promise<RecordFinishedWalkResult> {
  const stored = await readActiveWalkSession();
  // 저장된 키가 다른 방 것이면 쓰지 않는다. 그 키로 종료하면 이번 산책의
  // 수치가 엉뚱한 방의 기록이 된다.
  //
  // 원인을 갈라 말한다. 서버는 회원당 활성 세션을 하나만 두고 이미 있으면
  // 요청한 방을 무시하고 그걸 돌려주므로, 다른 방 산책을 끝내지 않은 채
  // 새 산책을 시작하면 키를 못 받는다 — 흔한 경로인데 "연결 실패"로 뭉개면
  // 사용자가 네트워크를 의심하며 계속 재시도한다.
  if (stored === null) {
    return {
      status: 'failed',
      message:
        '다른 산책이 아직 끝나지 않아 이 산책을 기록하지 못했어요. 진행 중인 산책을 먼저 종료해주세요.',
    };
  }
  if (stored.roomId !== walk.roomId) {
    // 방 번호만으로는 찾아갈 수 없으니 이름으로 말한다.
    const blockingRoom = stored.roomName ?? '다른 산책방';
    return {
      status: 'failed',
      message: `'${blockingRoom}'의 산책이 아직 진행 중이에요. 그 산책을 먼저 종료한 뒤 다시 시도해주세요.`,
    };
  }
  const walkSessionKey = stored.walkSessionKey;
  const endedAt = walk.endedAt.toISOString();

  try {
    const walkSession = await completeWithRetry({
      walkSessionKey,
      clientSessionKey: walkSessionKey,
      roomId: walk.roomId,
      bingoBoardId: stored.bingoBoardId,
      startedAt: stored.startedAt,
      endedAt,
      activeDurationSeconds: clampToServerWindow(
        walk.activeDurationSeconds,
        stored.startedAt,
        endedAt,
      ),
      step: walk.step,
      distance: walk.distance,
      calories: walk.calories,
    });
    await clearActiveWalkSession();
    // 서버가 완료 처리 안에서 그날 걸음 합계에 더한 몫을 걸음 원장에도 적어둔다. 안
    // 적으면 일일 기록 전송이 같은 걸음을 한 번 더 올려 그날 기록이 두 배가 된다.
    await reportStepsToLedger(
      toIsoDate(walk.endedAt),
      walk.step,
    ).catch(() => {});
    return { status: 'recorded', walkSession };
  } catch (error) {
    // 서버가 거절했으면 이 키는 더 쓸 수 없다. 응답을 아예 못 받은 경우에는
    // 서버가 기록을 만들어뒀을 수 있어 키를 남겨둔다.
    if (error instanceof ApiError) {
      await clearActiveWalkSession();
    }
    return { status: 'failed', message: messageOf(error) };
  }
}

export type FinishActiveWalkSessionResult = {
  outcome: RecordFinishedWalkResult;
  /** 반올림까지 끝낸, 서버에 실제로 보낸 최종 수치. 결과 화면 파라미터를
   * 다시 계산하지 않도록 호출부에 그대로 돌려준다. */
  finalSteps: number;
  finalDistanceMeters: number;
  finalCalories: number;
  finalElapsedSeconds: number;
};

/**
 * 네이티브 세션을 끝내고 그 결과를 서버에 기록한다. WalkSessionScreen의
 * "종료" 흐름(화면 이동·얼럿 포함)과, 앱을 스와이프해 지웠을 때 RootNavigator가
 * 화면 없이 조용히 정리하는 흐름이 이 핵심 로직을 공유한다 — UI는 각
 * 호출부가 알아서 붙인다.
 */
export async function finishAndRecordActiveWalkSession(
  roomId: number,
): Promise<FinishActiveWalkSessionResult> {
  // 네이티브 세션을 종료해 서비스·알림·GPS를 정지시키고 확정된 최종 수치를
  // 받아온다. 여기서부터는 되돌릴 수 없다.
  const final = await stopWalkSession();
  const finalSteps = Math.round(final.steps);
  const finalDistanceMeters = Math.round(final.distanceMeters);
  const finalCalories = Math.round(final.calories);
  // 서버는 이 값이 (종료 - 시작)보다 크면 요청을 거절한다. 올리지 않는다.
  const finalElapsedSeconds = Math.floor(final.activeElapsedMs / 1000);

  // 종료 시각은 여기서 한 번만 찍는다. 재시도할 때마다 새로 찍으면 산책
  // 시간이 그만큼 늘어난다.
  const outcome = await recordFinishedWalk({
    roomId,
    endedAt: new Date(),
    activeDurationSeconds: finalElapsedSeconds,
    step: finalSteps,
    distance: finalDistanceMeters,
    calories: finalCalories,
  });

  return { outcome, finalSteps, finalDistanceMeters, finalCalories, finalElapsedSeconds };
}
