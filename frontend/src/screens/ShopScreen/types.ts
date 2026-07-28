import type { SpriteName } from './assets/sprites';

export type ShopCategory = 'top' | 'bottom' | 'hat';

export type ShopItem = {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  /** 이미 구매한 아이템인지. 구매 전에는 가격 버튼을 보여준다. */
  owned: boolean;
  sprite: SpriteName;
};

export type ShopCharacter = {
  nickname: string;
  points: number;
  /** 카테고리마다 최대 한 개만 착용한다. */
  equippedItemIds: Partial<Record<ShopCategory, string>>;
};

/** 구매 여부로 목록을 거른다. */
export type ShopFilter = 'all' | 'owned' | 'notOwned';
