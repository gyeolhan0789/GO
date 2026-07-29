import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveEquippedItems } from '../api/memberApi';
import { findMockItems, USE_MOCK_CHARACTER } from '../mocks/characterMocks';
import type { Character } from '../model/character';
import { CHARACTER_QUERY_KEY } from './useMyCharacterQuery';

export function useSaveEquippedItemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberItemIds: number[]) => {
      if (USE_MOCK_CHARACTER) {
        return;
      }

      await saveEquippedItems(memberItemIds);
    },
    // 저장하면 홈·마이페이지가 들고 있는 캐릭터가 옛 옷차림으로 남는다. 목업은
    // 서버가 없으니 캐시를 직접 갈아끼워 같은 결과를 만든다.
    onSuccess: (_data, memberItemIds) => {
      if (USE_MOCK_CHARACTER) {
        queryClient.setQueryData<Character>(CHARACTER_QUERY_KEY, character =>
          character
            ? { ...character, equippedItems: findMockItems(memberItemIds) }
            : character,
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: CHARACTER_QUERY_KEY });
    },
  });
}
