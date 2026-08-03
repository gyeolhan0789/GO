import type {
  CharacterItem,
  CharacterLayer,
} from '../../member/model/character';
import { toImageSource } from '../../member/model/character';
import type { ShopItemResponse } from '../api/shopApi';

/**
 * 상점 목록에 놓이는 아이템. `CharacterLayer`를 확장해서 구매 전에도 캐릭터
 * 위에 그대로 겹쳐 그릴 수 있다(입어보기).
 */
export type ShopItem = CharacterLayer & {
  name: string;
  price: number;
  owned: boolean;
};

/**
 * 판매 목록에 보유 여부를 붙인다. 회원은 같은 아이템을 두 번 살 수 없어
 * itemId 하나로 맞춰볼 수 있다.
 */
export function toShopItems(
  items: ShopItemResponse[],
  ownedItems: CharacterItem[],
): ShopItem[] {
  const ownedItemIds = new Set(ownedItems.map(item => item.itemId));

  return items.map(item => ({
    itemId: item.itemId,
    category: item.category,
    image: toImageSource(item.imageUrl),
    name: item.name,
    price: item.price,
    owned: ownedItemIds.has(item.itemId),
  }));
}

/** 구매 직후, 보유 아이템 캐시에 바로 끼워 넣을 수 있는 모양으로 바꾼다. */
export function toPurchasedItem(
  item: ShopItem,
  memberItemId: number,
): CharacterItem {
  return {
    memberItemId,
    itemId: item.itemId,
    name: item.name,
    category: item.category,
    image: item.image,
  };
}
