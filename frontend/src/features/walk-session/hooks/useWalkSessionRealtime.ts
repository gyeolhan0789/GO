import { useBattleProgressSubscription } from '../../bingo/hooks/useBattleProgressSubscription';
import { useCooperativeProgressSubscription } from '../../bingo/hooks/useCooperativeProgressSubscription';
import { useRoomDetailQuery } from '../../room/hooks/useRoomDetailQuery';
import { useWalkSession } from './useWalkSession';

/**
 * 산책이 진행되는 동안 그 방의 실시간 구독을 붙든다.
 *
 * 구독을 빙고판 화면에 두면 화면을 벗어나는 순간 끊긴다 — 산책 중에는 지도나
 * 걸음 화면을 보고 있는 시간이 더 길어서, 남이 채운 칸을 놓치고 돌아온다.
 * 그래서 화면이 아니라 **산책 세션의 수명**에 맞춘다.
 *
 * 네비게이터에서 한 번만 부른다. 소켓은 하나를 공유하므로 여기서 잡아두면
 * 산책 중 어느 화면에 있어도 이벤트가 캐시에 그대로 얹힌다.
 */
export function useWalkSessionRealtime() {
  const { roomId, isActive } = useWalkSession();

  // 모드를 알아야 어느 토픽을 구독할지 정해진다. 산책 중이 아니면 조회도 하지 않는다.
  const roomQuery = useRoomDetailQuery(isActive ? roomId : null);
  const mode = roomQuery.data?.mode ?? null;

  useCooperativeProgressSubscription(roomId, isActive && mode === 'COOPERATE');
  useBattleProgressSubscription(roomId, isActive && mode === 'BATTLE');
}
