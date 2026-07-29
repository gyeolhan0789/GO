import type { ItemCategory } from '../api/memberApi';
import { CATEGORY_LAYER_ORDER } from '../constants/itemCategories';
import type { CharacterItem, CharacterLayer } from './character';

/**
 * 카테고리당 최대 한 개. 서버의 장착 제약(카테고리 유니크)과 같은 모양이다.
 *
 * 최소 조건만 걸어둬서 보유 아이템이 아닌 것도 미리 입혀볼 수 있다. 저장은
 * 회원 아이템에만 해당하므로 그쪽 함수만 `CharacterItem`으로 좁혀져 있다.
 */
export type EquippedByCategory<T extends CharacterLayer = CharacterItem> =
  Partial<Record<ItemCategory, T>>;

export function toEquippedByCategory<T extends CharacterLayer>(
  items: T[],
): EquippedByCategory<T> {
  return items.reduce<EquippedByCategory<T>>((equipped, item) => {
    equipped[item.category] = item;
    return equipped;
  }, {});
}

export function isEquipped<T extends CharacterLayer>(
  equipped: EquippedByCategory<T>,
  item: T,
): boolean {
  return equipped[item.category]?.itemId === item.itemId;
}

/** 같은 카테고리는 하나만 입을 수 있어 기존 착용분은 밀려난다. 다시 누르면 벗는다. */
export function toggleEquipped<T extends CharacterLayer>(
  equipped: EquippedByCategory<T>,
  item: T,
): EquippedByCategory<T> {
  const next = { ...equipped };

  if (isEquipped(equipped, item)) {
    delete next[item.category];
    return next;
  }

  next[item.category] = item;
  return next;
}

export function hasEquippedItem(
  equipped: EquippedByCategory<CharacterLayer>,
): boolean {
  return Object.values(equipped).some(item => item != null);
}

/** 캐릭터 위에 겹쳐 그릴 아이템들. 아래에 깔릴 것부터 순서대로 반환한다. */
export function selectLayerItems<T extends CharacterLayer>(
  equipped: EquippedByCategory<T>,
): T[] {
  return CATEGORY_LAYER_ORDER.map(category => equipped[category]).filter(
    (item): item is T => item != null,
  );
}

/** 저장 요청 본문. 비교하기 쉽도록 항상 같은 순서로 만든다. */
export function toMemberItemIds(
  equipped: EquippedByCategory<CharacterItem>,
): number[] {
  return selectLayerItems(equipped).map(item => item.memberItemId);
}

/** 저장 버튼을 열어줄지 판단하는 용도. 착용 조합이 같으면 보낼 필요가 없다. */
export function isSameEquipped(
  left: EquippedByCategory<CharacterItem>,
  right: EquippedByCategory<CharacterItem>,
): boolean {
  const leftIds = toMemberItemIds(left);
  const rightIds = toMemberItemIds(right);

  return (
    leftIds.length === rightIds.length &&
    leftIds.every((id, index) => id === rightIds[index])
  );
}
