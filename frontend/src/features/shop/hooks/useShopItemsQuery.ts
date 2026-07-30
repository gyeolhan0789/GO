import { useQuery } from '@tanstack/react-query';

import { getShopItems } from '../api/shopApi';

const STALE_TIME_MS = 60 * 1000;

export const SHOP_ITEMS_QUERY_KEY = ['shop', 'items'];

/**
 * 판매 중인 아이템 전체. 카테고리 필터는 서버 쿼리 대신 화면에서 거른다 —
 * 탭을 옮길 때마다 요청이 나가면 목록이 매번 비어 보인다.
 */
export function useShopItemsQuery() {
  return useQuery({
    queryKey: SHOP_ITEMS_QUERY_KEY,
    queryFn: () => getShopItems(),
    staleTime: STALE_TIME_MS,
  });
}
