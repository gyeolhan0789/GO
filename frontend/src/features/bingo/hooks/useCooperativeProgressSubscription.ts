import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { subscribeStompTopic } from '../../../shared/api/stompClient';
import type {
  BingoBoardResponse,
  BingoCellVerificationStatus,
} from '../api/bingoApi';

/** 백엔드 CooperativeBingoProgressUpdatedEvent와 같은 모양. 바뀐 칸 하나분이다. */
type CooperativeProgressEvent = {
  roomId: number;
  bingoBoardId: number;
  cellId: number;
  verificationStatus: BingoCellVerificationStatus;
  submittedByMemberId: number | null;
  rejectionReason: string | null;
  approvedCellCount: number;
  completedBingoCount: number;
};

function applyEvent(
  board: BingoBoardResponse,
  event: CooperativeProgressEvent,
): BingoBoardResponse {
  const cells = board.cells.map(cell =>
    cell.cellId === event.cellId
      ? {
          ...cell,
          verificationStatus: event.verificationStatus,
          submittedByMemberId: event.submittedByMemberId,
          rejectionReason: event.rejectionReason,
        }
      : cell,
  );

  return {
    ...board,
    cells,
    approvedCellCount: event.approvedCellCount,
    completedBingoCount: event.completedBingoCount,
  };
}

/**
 * 협동 빙고판의 변화를 실시간으로 받아 캐시에 얹는다.
 *
 * 협동은 판 하나를 여럿이 나눠 채우는데, 남이 칸을 채운 걸 알 방법이 조회뿐이라
 * 화면을 다시 열기 전까지 내 판이 멈춰 있었다. 승인/거절 둘 다 이벤트가 오고,
 * 칸의 상태와 누가 채웠는지가 같이 실려서 색까지 바로 맞는다.
 *
 * 줄 수가 바뀐 이벤트에서는 다시 불러온다 — 그때 판이 끝났거나 갱신이 필요해질 수
 * 있는데(completed, renewalRequired, renewalMessage) 이벤트에는 그 값들이 없다.
 */
export function useCooperativeProgressSubscription(
  roomId: number | null,
  enabled: boolean,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (roomId === null || !enabled) {
      return;
    }

    const queryKey = ['bingoBoards', 'active', roomId];
    const subscription = subscribeStompTopic<CooperativeProgressEvent>(
      `/topic/rooms/${roomId}/bingo-progress`,
      event => {
        const board = queryClient.getQueryData<BingoBoardResponse>(queryKey);
        // 판을 갱신한 직후라면 지난 판의 이벤트가 늦게 올 수 있다. 칸은 못 찾고
        // 카운트만 갈아 끼워지면 화면이 어긋나므로 그냥 흘린다.
        if (board == null || board.bingoBoardId !== event.bingoBoardId) {
          return;
        }

        queryClient.setQueryData<BingoBoardResponse>(queryKey, cached =>
          cached == null ? cached : applyEvent(cached, event),
        );

        if (event.completedBingoCount !== board.completedBingoCount) {
          queryClient.invalidateQueries({ queryKey });
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [roomId, enabled, queryClient]);
}
