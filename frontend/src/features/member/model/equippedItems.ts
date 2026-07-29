import type { ItemCategory } from '../api/memberApi';
import { CATEGORY_LAYER_ORDER } from '../constants/itemCategories';
import type { CharacterItem } from './character';

/** 카테고리당 최대 한 개. 서버의 장착 제약(카테고리 유니크)과 같은 모양이다. */
export type EquippedByCategory = Partial<Record<ItemCategory, CharacterItem>>;

export function toEquippedByCategory(
  items: CharacterItem[],
): EquippedByCategory {
  return items.reduce<EquippedByCategory>((equipped, item) => {
    equipped[item.category] = item;
    return equipped;
  }, {});
}

export function isEquipped(
  equipped: EquippedByCategory,
  item: CharacterItem,
): boolean {
  return equipped[item.category]?.memberItemId === item.memberItemId;
}

/**
 * 아이템을 입히거나 벗긴다. 같은 카테고리에는 하나만 입을 수 있어 기존 착용분은
 * 밀려나고, 이미 입고 있는 아이템을 다시 누르면 벗는다.
 */
export function toggleEquipped(
  equipped: EquippedByCategory,
  item: CharacterItem,
): EquippedByCategory {
  const next = { ...equipped };

  if (isEquipped(equipped, item)) {
    delete next[item.category];
    return next;
  }

  next[item.category] = item;
  return next;
}

export function hasEquippedItem(equipped: EquippedByCategory): boolean {
  return Object.values(equipped).some(item => item != null);
}

/** 캐릭터 위에 겹쳐 그릴 아이템들. 아래에 깔릴 것부터 순서대로 반환한다. */
export function selectLayerItems(
  equipped: EquippedByCategory,
): CharacterItem[] {
  return CATEGORY_LAYER_ORDER.map(category => equipped[category]).filter(
    (item): item is CharacterItem => item != null,
  );
}

/** 저장 요청 본문. 비교하기 쉽도록 항상 같은 순서로 만든다. */
export function toMemberItemIds(equipped: EquippedByCategory): number[] {
  return selectLayerItems(equipped).map(item => item.memberItemId);
}

/** 저장 버튼을 열어줄지 판단하는 용도. 착용 조합이 같으면 보낼 필요가 없다. */
export function isSameEquipped(
  left: EquippedByCategory,
  right: EquippedByCategory,
): boolean {
  const leftIds = toMemberItemIds(left);
  const rightIds = toMemberItemIds(right);

  return (
    leftIds.length === rightIds.length &&
    leftIds.every((id, index) => id === rightIds[index])
  );
}
