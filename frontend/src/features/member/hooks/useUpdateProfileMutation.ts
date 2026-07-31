import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateMyProfile } from '../api/memberApi';
import { USE_MOCK_CHARACTER } from '../mocks/characterMocks';
import type { Character } from '../model/character';
import { CHARACTER_QUERY_KEY } from './useMyCharacterQuery';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nickname: string) => updateMyProfile({ nickname }),
    // 닉네임은 캐릭터 응답으로 내려오므로, 바꿨으면 그 캐시를 다시 읽어야 한다.
    // 목업 모드에서는 재조회가 막혀 있어(useMyCharacterQuery) 캐시를 직접 고친다.
    onSuccess: (_data, nickname) => {
      if (USE_MOCK_CHARACTER) {
        queryClient.setQueryData<Character>(CHARACTER_QUERY_KEY, character =>
          character ? { ...character, nickname } : character,
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: CHARACTER_QUERY_KEY });
    },
  });
}
