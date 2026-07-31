import type { ShopFilter } from './types';

export const SHOP_FILTERS: { label: string; value: ShopFilter }[] = [
  { label: '전체', value: 'all' },
  { label: '구매한 아이템', value: 'owned' },
  { label: '미구매 아이템', value: 'notOwned' },
];
