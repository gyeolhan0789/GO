import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ProfileUpdateRequest } from '../api/memberApi';
import { updateMyProfile } from '../api/memberApi';
import { USE_MOCK_CHARACTER } from '../mocks/characterMocks';
import type { Character } from '../model/character';
import { CHARACTER_QUERY_KEY } from './useMyCharacterQuery';
import { MY_PAGE_QUERY_KEY } from './useMyPageQuery';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProfileUpdateRequest) => updateMyProfile(request),
    // 닉네임은 캐릭터 응답으로, 성별/지역은 마이페이지 응답으로 내려오므로
    // 바꿨으면 그 캐시를 다시 읽어야 한다. 목업 모드에서는 캐릭터 재조회가
    // 막혀 있어(useMyCharacterQuery) 닉네임만 캐시를 직접 고친다.
    onSuccess: (_data, request) => {
      if (USE_MOCK_CHARACTER && request.nickname !== undefined) {
        const nickname = request.nickname;
        queryClient.setQueryData<Character>(CHARACTER_QUERY_KEY, character =>
          character ? { ...character, nickname } : character,
        );
      } else {
        queryClient.invalidateQueries({ queryKey: CHARACTER_QUERY_KEY });
      }

      queryClient.invalidateQueries({ queryKey: MY_PAGE_QUERY_KEY });
    },
  });
}
