import type { ItemCategory } from '../../features/member/api/memberApi';
import type { CharacterLayer } from '../../features/member/model/character';
import type { EquippedByCategory } from '../../features/member/model/equippedItems';
import { isEquipped } from '../../features/member/model/equippedItems';
import type { ShopItem } from '../../features/shop/model/shopItem';
import type { ShopFilter } from './types';

export function selectVisibleItems(
  items: ShopItem[],
  category: ItemCategory,
  filter: ShopFilter,
): ShopItem[] {
  return items.filter(item => {
    if (item.category !== category) {
      return false;
    }
    if (filter === 'owned') {
      return item.owned;
    }
    if (filter === 'notOwned') {
      return !item.owned;
    }
    return true;
  });
}

/**
 * 카테고리 슬롯에 아이템을 끼운다. 벗기는 '착용 아이템 초기화'가 담당하므로
 * 착용 중인 아이템을 다시 눌러도 슬롯이 비지 않는다(꾸미기 화면의
 * `toggleEquipped`와 다른 점이다).
 */
export function equipItem<T extends CharacterLayer>(
  equipped: EquippedByCategory<T>,
  item: T,
): EquippedByCategory<T> {
  if (isEquipped(equipped, item)) {
    return equipped;
  }

  return { ...equipped, [item.category]: item };
}
