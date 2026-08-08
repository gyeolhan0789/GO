import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { subscribeStompTopic } from '../../../shared/api/stompClient';
import type { BattleProgress, BingoBoardResponse } from '../api/bingoApi';

/** 백엔드 BattleBingoProgressUpdatedEvent와 같은 모양. 참가자 한 명분이다. */
type BattleProgressEvent = {
  roomId: number;
  gameId: number;
  participantMemberId: number;
  bingoBoardId: number;
  approvedCellCount: number;
  completedBingoCount: number;
  targetReached: boolean;
};

function applyEvent(
  progress: BattleProgress,
  event: BattleProgressEvent,
): BattleProgress {
  const patch = {
    approvedCellCount: event.approvedCellCount,
    completedBingoCount: event.completedBingoCount,
    targetReached: event.targetReached,
  };

  if (progress.me.memberId === event.participantMemberId) {
    return { ...progress, me: { ...progress.me, ...patch } };
  }
  if (progress.opponent.memberId === event.participantMemberId) {
    return { ...progress, opponent: { ...progress.opponent, ...patch } };
  }
  // 이 방 참가자가 아니다. 남의 값을 우리 판에 얹느니 그냥 흘린다.
  return progress;
}

/**
 * 대결 진행률을 실시간으로 받아 활성 빙고판 캐시에 얹는다.
 *
 * 상대 판은 내가 조회할 수 없어서(내 판만 내려온다) 이 토픽이 상대 진행률을
 * 아는 유일한 경로다. 이벤트가 참가자 한 명분이라 me/opponent 중 맞는 쪽만
 * 갈아 끼운다.
 *
 * 목표에 닿은 이벤트에서는 다시 불러온다 — 그때 게임 상태(gameStatus)가 같이
 * 바뀌는데 이벤트에는 그 값이 없다.
 */
export function useBattleProgressSubscription(
  roomId: number | null,
  enabled: boolean,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (roomId === null || !enabled) {
      return;
    }

    const queryKey = ['bingoBoards', 'active', roomId];
    const subscription = subscribeStompTopic<BattleProgressEvent>(
      `/topic/rooms/${roomId}/battle-progress`,
      event => {
        queryClient.setQueryData<BingoBoardResponse>(queryKey, board => {
          if (board?.battleProgress == null) {
            return board;
          }
          return {
            ...board,
            battleProgress: applyEvent(board.battleProgress, event),
          };
        });

        if (event.targetReached) {
          queryClient.invalidateQueries({ queryKey });
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [roomId, enabled, queryClient]);
}
