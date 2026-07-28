import type { ShopCategory, ShopFilter } from './types';

export const SHOP_CATEGORIES: { label: string; value: ShopCategory }[] = [
  { label: '상의', value: 'top' },
  { label: '하의', value: 'bottom' },
  { label: '모자', value: 'hat' },
];

export const SHOP_FILTERS: { label: string; value: ShopFilter }[] = [
  { label: '전체', value: 'all' },
  { label: '구매한 아이템', value: 'owned' },
  { label: '미구매 아이템', value: 'notOwned' },
];
