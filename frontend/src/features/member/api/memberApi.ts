import { apiClient } from '../../../shared/api/client';

export type ItemCategory =
  | 'HAT'
  | 'TOP'
  | 'BOTTOM'
  | 'SHOES'
  | 'SUNGLASSES'
  | 'ACCESSORY';

export type EquippedItem = {
  memberItemId: number;
  itemId: number;
  name: string;
  category: ItemCategory;
  imageUrl: string;
};

export type MyCharacterResponse = {
  memberId: number;
  nickname: string;
  equippedItems: EquippedItem[];
};

export type CashResponse = {
  cash: number;
};

export function getMyCharacter() {
  return apiClient.get<MyCharacterResponse>('/members/character');
}

export function getMyCash() {
  return apiClient.get<CashResponse>('/members/cash');
}
