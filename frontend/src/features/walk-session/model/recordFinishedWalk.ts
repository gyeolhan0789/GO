import { ApiError } from '../../../shared/api/ApiError';
import { saveHistory } from '../../history/api/historyApi';
import { toIsoDate } from '../../history/model/period';
import {
  completeWalkSession,
  type WalkSessionCompleteRequest,
  type WalkSessionCompleteResponse,
} from '../api/walkSessionApi';
import {
  clearActiveWalkSession,
  readActiveWalkSession,
} from './activeSessionStorage';

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
  /** 세션 키를 못 써서 그날 걸음 합계만 올렸다. 기록 카드는 생기지 않는다. */
  | { status: 'stepsOnly' }
  /** 아무것도 못 올렸다. */
  | { status: 'failed'; message: string };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.';
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

async function saveStepsOnly(
  walk: FinishedWalk,
): Promise<RecordFinishedWalkResult> {
  try {
    await saveHistory({
      historyDate: toIsoDate(walk.endedAt),
      step: walk.step,
      distance: walk.distance,
      calories: walk.calories,
    });
    return { status: 'stepsOnly' };
  } catch (error) {
    return { status: 'failed', message: messageOf(error) };
  }
}

/**
 * 끝난 산책을 서버에 올린다.
 *
 * 세션 키가 있으면 산책 기록으로 남기고, 없거나 서버가 그 키를 거절하면 그날
 * 걸음 합계만 따로 올린다. 두 경로를 다 타면 안 된다 — 산책 완료 API가 그
 * 안에서 걸음 합계까지 누적하기 때문에, 둘 다 부르면 같은 걸음이 두 번 더해진다.
 */
export async function recordFinishedWalk(
  walk: FinishedWalk,
): Promise<RecordFinishedWalkResult> {
  const stored = await readActiveWalkSession();
  // 저장된 키가 다른 방 것이면 쓰지 않는다. 그 키로 종료하면 이번 산책의
  // 수치가 엉뚱한 방의 기록이 된다.
  const walkSessionKey =
    stored !== null && stored.roomId === walk.roomId
      ? stored.walkSessionKey
      : null;

  if (walkSessionKey !== null) {
    try {
      const walkSession = await completeWithRetry({
        walkSessionKey,
        endedAt: walk.endedAt.toISOString(),
        activeDurationSeconds: walk.activeDurationSeconds,
        step: walk.step,
        distance: walk.distance,
        calories: walk.calories,
      });
      await clearActiveWalkSession();
      return { status: 'recorded', walkSession };
    } catch (error) {
      if (!(error instanceof ApiError)) {
        // 재시도까지 응답을 못 받았다. 서버가 이미 그날 걸음을 더했을 수 있어
        // 걸음 합계 쪽으로 내려가지 않는다 — 두 번 세느니 이번 산책을 못
        // 남기는 편이 낫다. 키는 남겨둬 다음 시작 때 판정에 쓰게 한다.
        return { status: 'failed', message: messageOf(error) };
      }
      // 서버가 거절했으면 트랜잭션이 통째로 롤백돼 걸음 합계도 안 들어갔다.
      // 이 키는 더 쓸 수 없으므로 지우고 걸음만 올린다.
      await clearActiveWalkSession();
    }
  }

  return saveStepsOnly(walk);
}
