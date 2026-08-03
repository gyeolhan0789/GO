import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ProfileUpdateRequest } from '../api/memberApi';
import { updateMyProfile } from '../api/memberApi';
import { CHARACTER_QUERY_KEY } from './useMyCharacterQuery';
import { MY_PAGE_QUERY_KEY } from './useMyPageQuery';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProfileUpdateRequest) => updateMyProfile(request),
    // 닉네임은 캐릭터 응답으로, 성별/지역은 마이페이지 응답으로 내려오므로
    // 바꿨으면 그 캐시를 다시 읽어야 한다.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MY_PAGE_QUERY_KEY });
    },
  });
}
