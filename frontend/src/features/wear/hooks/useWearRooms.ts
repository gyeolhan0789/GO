import { useQueries } from '@tanstack/react-query';

import { getActiveBingoBoard } from '../../bingo/api/bingoApi';
import { useMyMemberIdQuery } from '../../member/hooks/useMyMemberIdQuery';
import { useMyRoomsQuery } from '../../room/hooks/useMyRoomsQuery';
import type { MyRoomResponse } from '../../room/api/roomApi';
import type { WearRoom } from '../../../shared/lib/wearBridge';

/**
 * 워치의 산책방 목록.
 *
 * 워치에는 빙고판을 새로 만드는 UI가 없다. 갱신이 필요한 방을 그냥 보여주면
 * 눌러도 시작이 안 되는 방이 되므로, 폰의 WalkRoomSelectSheet와 같은 규칙으로
 * 미리 걸러 이유를 붙여 보낸다.
 *
 * 방마다 빙고판을 한 번씩 조회해야 해서, 워치가 실제로 붙어 있을 때만 켠다
 * ([enabled]). 참여 중인 방 수는 많아야 몇 개라 그 경우엔 부담이 되지 않는다.
 */
export function useWearRooms(enabled: boolean): WearRoom[] {
  const roomsQuery = useMyRoomsQuery();
  const rooms = roomsQuery.data ?? [];
  const myMemberIdQuery = useMyMemberIdQuery();

  const boardQueries = useQueries({
    queries: rooms.map(room => ({
      // useActiveBingoBoardQuery와 같은 키라서 이미 받아둔 방은 다시 안 부른다.
      queryKey: ['bingoBoards', 'active', room.roomId],
      queryFn: () => getActiveBingoBoard(room.roomId),
      enabled,
    })),
  });

  return rooms.map((room, index) => {
    const board = boardQueries[index]?.data;
    return {
      roomId: room.roomId,
      name: room.name,
      mode: room.mode,
      memberCount: room.members.length,
      completedMissionCount: room.completedMissionCount,
      totalMissionCount: room.totalMissionCount,
      // 아직 판을 못 받았으면 막지 않는다. 시작 명령이 오면 폰이 한 번 더
      // 확인하므로, 조회가 늦다고 목록을 통째로 잠글 이유는 없다.
      startable: !board?.renewalRequired,
      blockedReason: board?.renewalRequired
        ? toBlockedReason(room, myMemberIdQuery.data ?? null)
        : undefined,
    };
  });
}

function toBlockedReason(room: MyRoomResponse, myMemberId: number | null) {
  return room.hostId === myMemberId
    ? '폰에서 다음 목표를 설정해주세요'
    : '방장이 목표를 설정하면 시작할 수 있어요';
}
