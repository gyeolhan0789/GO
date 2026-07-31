import { useQuery } from '@tanstack/react-query';

import { getMyCharacter } from '../api/memberApi';

/** 방장인지 비교하는 용도로만 쓴다. 캐릭터 표시 정보(Character 모델)는
 * memberId를 담지 않아 useMyCharacterQuery로는 알 수 없다. */
export function useMyMemberIdQuery() {
  return useQuery({
    queryKey: ['member', 'character', 'memberId'],
    queryFn: async () => (await getMyCharacter()).memberId,
    staleTime: Infinity,
  });
}
