import type { ItemCategory } from '../api/memberApi';

/**
 * 우리가 다루는 카테고리 전부. 상점·꾸미기 탭의 순서이기도 하다.
 *
 * 백엔드 enum에는 신발·안경도 있지만 파는 아이템이 없어 앱에서는 다루지 않는다
 * (`ItemCategory` 참고). 서버가 그 카테고리를 내려주면 경계에서 걸러진다 —
 * `isSupportedItemCategory`.
 */
export const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'HAT', label: '모자' },
  { value: 'TOP', label: '상의' },
  { value: 'BOTTOM', label: '하의' },
  { value: 'ACCESSORY', label: '액세서리' },
];

/**
 * 서버가 준 카테고리가 앱이 다루는 값인지 본다.
 *
 * 타입만으로는 막을 수 없다 — `ItemCategory`는 응답을 옮겨 적은 것일 뿐이고,
 * 서버는 여전히 신발·안경 아이템을 내려줄 수 있다. 그 값이 그대로 흘러들면
 * 겹쳐 그리는 순서와 썸네일 규격에서 자리를 못 찾는다.
 */
export function isSupportedItemCategory(value: string): value is ItemCategory {
  return ITEM_CATEGORIES.some(category => category.value === value);
}

/**
 * 캐릭터 위에 겹쳐 그리는 순서. 뒤에 있는 카테고리가 위로 올라온다.
 *
 * 상의가 하의 허리선을 덮어야 자연스럽고, 얼굴·머리에 얹는 모자는 가장 위에
 * 둔다.
 */
export const CATEGORY_LAYER_ORDER: ItemCategory[] = [
  'BOTTOM',
  'TOP',
  'ACCESSORY',
  'HAT',
];
