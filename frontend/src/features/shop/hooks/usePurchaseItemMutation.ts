import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PointResponse } from '../../member/api/memberApi';
import { POINT_QUERY_KEY } from '../../member/hooks/useMyPointQuery';
import { MY_ITEMS_QUERY_KEY } from '../../member/hooks/useMyItemsQuery';
import type { CharacterItem } from '../../member/model/character';
import { purchaseItem } from '../api/shopApi';
import type { ShopItem } from '../model/shopItem';
import { toPurchasedItem } from '../model/shopItem';

/**
 * 아이템 구매. 아이템 전체를 받는 건 응답의 memberItemId만으로는 보유 아이템
 * 캐시에 넣을 이름·이미지를 알 수 없기 때문이다.
 */
export function usePurchaseItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ShopItem) => purchaseItem(item.itemId),
    // 바뀐 값은 응답에 다 들어 있다. 재조회에 맡기면 구매 직후에도 옛 포인트와
    // 가격 버튼이 잠깐 남으므로 캐시를 직접 갱신한다.
    onSuccess: (response, item) => {
      queryClient.setQueryData<PointResponse>(POINT_QUERY_KEY, {
        point: response.remainingPoint,
      });
      queryClient.setQueryData<CharacterItem[]>(MY_ITEMS_QUERY_KEY, items =>
        items
          ? [...items, toPurchasedItem(item, response.memberItemId)]
          : items,
      );
    },
  });
}
