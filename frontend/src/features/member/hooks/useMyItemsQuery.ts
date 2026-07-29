import { useQuery } from '@tanstack/react-query';

import { getMyItems } from '../api/memberApi';
import { MOCK_OWNED_ITEMS, USE_MOCK_CHARACTER } from '../mocks/characterMocks';
import type { CharacterItem } from '../model/character';
import { toCharacterItem } from '../model/character';

// 보유 아이템은 상점에서 구매할 때만 늘어난다. 꾸미기 화면을 여닫을 때마다 다시
// 부르지 않도록 잠깐 캐시를 유지한다.
const STALE_TIME_MS = 60 * 1000;

export const MY_ITEMS_QUERY_KEY = ['member', 'items'];

async function fetchMyItems(): Promise<CharacterItem[]> {
  if (USE_MOCK_CHARACTER) {
    return MOCK_OWNED_ITEMS;
  }

  return (await getMyItems()).map(toCharacterItem);
}

/**
 * 보유 아이템 전체. 카테고리 필터는 서버 쿼리 대신 화면에서 거른다 —
 * 탭을 옮길 때마다 요청이 나가면 미리보기가 매번 비어 보인다.
 */
export function useMyItemsQuery() {
  return useQuery({
    queryKey: MY_ITEMS_QUERY_KEY,
    queryFn: fetchMyItems,
    staleTime: STALE_TIME_MS,
  });
}
