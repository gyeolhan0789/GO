import { useQuery } from '@tanstack/react-query';

import { getMyCharacter } from '../api/memberApi';
import { MOCK_CHARACTER, USE_MOCK_CHARACTER } from '../mocks/characterMocks';
import type { Character } from '../model/character';
import { toCharacter } from '../model/character';

const STALE_TIME_MS = 60 * 1000;

export const CHARACTER_QUERY_KEY = ['member', 'character'];

async function fetchCharacter(): Promise<Character> {
  const character = toCharacter(await getMyCharacter());

  if (!USE_MOCK_CHARACTER) {
    return character;
  }

  // 목업으로 바꾸는 건 이미지뿐이다. 닉네임은 서버 값을 그대로 쓴다 —
  // 프로필 수정은 목업 모드에서도 실제 API로 저장된다.
  return {
    ...character,
    baseImage: MOCK_CHARACTER.baseImage,
    equippedItems: MOCK_CHARACTER.equippedItems,
  };
}

export function useMyCharacterQuery() {
  return useQuery({
    queryKey: CHARACTER_QUERY_KEY,
    queryFn: fetchCharacter,
    // 목업일 때 다시 읽으면 방금 입힌 옷이 초기 조합으로 되돌아간다. 저장이
    // 캐시를 직접 갱신하므로(useSaveEquippedItemsMutation) 재조회를 막는다.
    staleTime: USE_MOCK_CHARACTER ? Infinity : STALE_TIME_MS,
  });
}
