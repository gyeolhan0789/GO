import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveEquippedItems } from '../api/memberApi';
import { CHARACTER_QUERY_KEY } from './useMyCharacterQuery';

export function useSaveEquippedItemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberItemIds: number[]) => saveEquippedItems(memberItemIds),
    // 저장하면 홈·마이페이지가 들고 있는 캐릭터가 옛 옷차림으로 남으므로 다시 읽는다.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_QUERY_KEY });
    },
  });
}
