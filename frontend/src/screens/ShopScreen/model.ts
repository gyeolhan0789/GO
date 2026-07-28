import type {
  ShopCategory,
  ShopCharacter,
  ShopFilter,
  ShopItem,
} from './types';

export function selectVisibleItems(
  items: ShopItem[],
  category: ShopCategory,
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

export function isEquipped(character: ShopCharacter, item: ShopItem): boolean {
  return character.equippedItemIds[item.category] === item.id;
}

export function hasEquippedItem(character: ShopCharacter): boolean {
  return Object.values(character.equippedItemIds).some(id => id != null);
}

/**
 * 카테고리 슬롯에 아이템을 끼운다. 같은 카테고리는 하나만 착용하므로
 * 기존 착용분은 밀려난다. 벗기는 '착용 아이템 초기화'가 담당하므로,
 * 착용 중인 아이템을 다시 눌러도 슬롯이 비지 않는다.
 */
export function equipItem(
  character: ShopCharacter,
  item: ShopItem,
): ShopCharacter {
  if (isEquipped(character, item)) {
    return character;
  }

  return {
    ...character,
    equippedItemIds: {
      ...character.equippedItemIds,
      [item.category]: item.id,
    },
  };
}

export function resetEquipped(character: ShopCharacter): ShopCharacter {
  return { ...character, equippedItemIds: {} };
}

/** 구매하면 포인트를 차감하고 바로 착용시킨다. */
export function purchaseItem(
  character: ShopCharacter,
  item: ShopItem,
): ShopCharacter {
  return {
    ...character,
    points: character.points - item.price,
    equippedItemIds: {
      ...character.equippedItemIds,
      [item.category]: item.id,
    },
  };
}

export function markItemOwned(items: ShopItem[], itemId: string): ShopItem[] {
  return items.map(item =>
    item.id === itemId ? { ...item, owned: true } : item,
  );
}
