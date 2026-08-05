import { ApiError } from '../../../shared/api/ApiError';
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
  /** 못 올렸다. 이 산책은 기록에도, 그날 걸음 합계에도 들어가지 않는다. */
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

  try {
    const walkSession = await completeWithRetry({
      walkSessionKey,
      clientSessionKey: walkSessionKey,
      roomId: walk.roomId,
      bingoBoardId: stored.bingoBoardId,
      startedAt: stored.startedAt,
      endedAt: walk.endedAt.toISOString(),
      activeDurationSeconds: walk.activeDurationSeconds,
      step: walk.step,
      distance: walk.distance,
      calories: walk.calories,
    });
    await clearActiveWalkSession();
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
