import { useQuery } from '@tanstack/react-query';

import { getActiveBingoBoard } from '../api/bingoApi';
import { ApiError } from '../../../shared/api/ApiError';

/**
 * "지금 판이 없다"를 뜻하는 상태들. 409는 게임이 아직 시작되지 않았을 때
 * (ROOM_NOT_IN_PROGRESS), 404는 판을 못 찾았을 때(BINGO_BOARD_NOT_FOUND)다.
 */
const NO_BOARD_STATUSES = [404, 409];

export function useActiveBingoBoardQuery(roomId: number | null) {
  return useQuery({
    queryKey: ['bingoBoards', 'active', roomId],
    queryFn: () => getActiveBingoBoard(roomId as number),
    enabled: roomId !== null,
    /**
     * 404·409는 실패가 아니라 "아직 판이 없다"는 답이다. 대결은 상대가 수락해야
     * 게임이 만들어지므로 그전에는 이 응답이 정상인데, 기본 재시도가 같은 응답을
     * 네 번 두드려 에러처럼 보였다. 다시 물어도 답이 바뀌지 않으니 한 번에 끝낸다.
     * 그 밖의 실패(네트워크 등)는 라이브러리 기본값대로 세 번까지 다시 시도한다.
     */
    retry: (failureCount, error) => {
      if (error instanceof ApiError && NO_BOARD_STATUSES.includes(error.status)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
