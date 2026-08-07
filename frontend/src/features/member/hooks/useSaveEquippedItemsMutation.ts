import { useMutation, useQueryClient } from '@tanstack/react-query';

import { RANKING_QUERY_KEY } from '../../ranking/hooks/useRankingQuery';
import { saveEquippedItems } from '../api/memberApi';
import { CHARACTER_QUERY_KEY } from './useMyCharacterQuery';

/**
 * 내 아바타는 회원 조회 한 곳에만 있는 게 아니다. 랭킹과 방 응답도 멤버마다
 * 착용 아이템 스냅샷을 실어 보내므로, 갈아입은 뒤 그 캐시를 그대로 두면 홈·마이
 * 페이지만 새 옷이 되고 랭킹 줄이나 방 멤버 목록은 옛 옷차림으로 남는다.
 */
export function useSaveEquippedItemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberItemIds: number[]) => saveEquippedItems(memberItemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: RANKING_QUERY_KEY });
      // 방 상세(['rooms', roomId])와 내 방 목록(['rooms', 'mine', ...])이 모두
      // 멤버 아바타를 싣고 온다. 빙고판·대결 화면의 아바타도 이 응답에서 온다.
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}
