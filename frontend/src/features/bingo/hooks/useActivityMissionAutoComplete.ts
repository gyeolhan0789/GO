import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../../shared/api/ApiError';
import { completeBingoCell, type BingoCellResponse } from '../api/bingoApi';
import { isActivityMissionComplete, type ActivityMetrics } from '../model/missionJudgment';
import { isPhotoMission } from '../model/missionType';
import { useActiveBingoBoardQuery } from './useActiveBingoBoardQuery';

function isPendingActivityCell(cell: BingoCellResponse) {
  return !isPhotoMission(cell.mission.type) && cell.verificationStatus !== 'APPROVED';
}

/**
 * 걷는 동안 활동 기반 미션 칸을 자동으로 완료 처리한다. 활성 빙고판에서
 * 아직 승인되지 않은 활동 미션 칸만 추려뒀다가, metrics가 갱신될 때마다(새
 * 폴링/타이머를 추가하지 않고 호출부가 넘겨주는 값 그대로) 판정하고 통과하면
 * completeBingoCell을 호출한다. roomId가 없으면 아무 것도 하지 않는다.
 *
 * 완료 토스트 메시지는 훅이 큐로 들고 있다가 하나씩 내보낸다 — 화면은
 * toastMessage/hideToast를 기존 Toast 컴포넌트에 그대로 연결하면 된다.
 */
export function useActivityMissionAutoComplete(
  roomId: number | null,
  metrics: ActivityMetrics,
) {
  const boardQuery = useActiveBingoBoardQuery(roomId);
  const queryClient = useQueryClient();
  // 요청이 나가 있는 칸을 표시해 같은 칸에 중복 호출이 나가지 않게 막는다.
  // 리렌더를 유발할 필요가 없어 ref로 둔다.
  const inFlightRef = useRef(new Set<number>());
  const [toastQueue, setToastQueue] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage === null && toastQueue.length > 0) {
      setToastMessage(toastQueue[0]);
      setToastQueue(queue => queue.slice(1));
    }
  }, [toastMessage, toastQueue]);

  const hideToast = useCallback(() => setToastMessage(null), []);

  useEffect(() => {
    if (roomId === null || !boardQuery.data) {
      return;
    }

    boardQuery.data.cells.filter(isPendingActivityCell).forEach(cell => {
      if (inFlightRef.current.has(cell.cellId)) {
        return;
      }
      const passed = isActivityMissionComplete(
        cell.mission.type,
        cell.mission.decisionCondition,
        metrics,
      );
      if (!passed) {
        return;
      }

      inFlightRef.current.add(cell.cellId);
      completeBingoCell(roomId, cell.cellId)
        .then(({ rewardPoint }) => {
          setToastQueue(queue => [
            ...queue,
            `'${cell.mission.title}' 완료! +${rewardPoint}P`,
          ]);
          queryClient.invalidateQueries({ queryKey: ['bingoBoards', 'active', roomId] });
        })
        .catch(error => {
          // 이미 승인된 칸(예: 협동 모드에서 팀원이 먼저 완료)이면 조용히
          // 최신 상태로 맞추기만 한다. 그 외 에러는 다음 metrics 갱신 때
          // 다시 시도한다 — inFlight만 풀어주면 된다.
          if (error instanceof ApiError && error.status === 409) {
            queryClient.invalidateQueries({ queryKey: ['bingoBoards', 'active', roomId] });
          }
        })
        .finally(() => {
          inFlightRef.current.delete(cell.cellId);
        });
    });
  }, [roomId, boardQuery.data, metrics, queryClient]);

  return { toastMessage, hideToast };
}
