import type { ItemCategory } from '../api/memberApi';

/** 백엔드 `ItemCategory` enum과 1:1로 대응한다. 탭에 보여줄 순서다. */
export const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'HAT', label: '모자' },
  { value: 'SUNGLASSES', label: '안경' },
  { value: 'TOP', label: '상의' },
  { value: 'BOTTOM', label: '하의' },
  { value: 'SHOES', label: '신발' },
  { value: 'ACCESSORY', label: '액세서리' },
];

/**
 * 캐릭터 위에 겹쳐 그리는 순서. 뒤에 있는 카테고리가 위로 올라온다.
 *
 * 상의가 하의 허리선을, 신발이 바지 밑단을 덮어야 자연스럽다. 얼굴에 얹는
 * 안경·모자는 가장 위에 두고, 모자챙이 안경을 가릴 수 있으므로 모자를 마지막에
 * 그린다.
 */
export const CATEGORY_LAYER_ORDER: ItemCategory[] = [
  'BOTTOM',
  'SHOES',
  'TOP',
  'ACCESSORY',
  'SUNGLASSES',
  'HAT',
];
