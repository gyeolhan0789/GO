import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateMyProfile } from '../api/memberApi';
import { CHARACTER_QUERY_KEY } from './useMyCharacterQuery';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nickname: string) => updateMyProfile({ nickname }),
    // 닉네임은 캐릭터 응답으로 내려오므로, 바꿨으면 그 캐시를 다시 읽어야 한다.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARACTER_QUERY_KEY });
    },
  });
}
