import { apiClient } from '../../../shared/api/client';
import type { ItemCategory } from '../../member/api/memberApi';

/** 판매 중인 아이템 한 개. 보유 여부는 회원 아이템 목록과 맞춰봐야 알 수 있다. */
export type ShopItemResponse = {
  itemId: number;
  name: string;
  category: ItemCategory;
  price: number;
  imageUrl: string | null;
};

export type ItemPurchaseResponse = {
  memberItemId: number;
  itemId: number;
  /** 차감 후 남은 포인트. 다시 조회하지 않아도 되게 서버가 함께 내려준다. */
  remainingPoint: number;
};

/** category를 생략하면 판매 중인 전체 아이템을 내려준다. */
export function getShopItems(category?: ItemCategory) {
  return apiClient.get<ShopItemResponse[]>(
    category ? `/shop/items?category=${category}` : '/shop/items',
  );
}

export function purchaseItem(itemId: number) {
  return apiClient.post<ItemPurchaseResponse>(`/shop/items/${itemId}/purchase`);
}
