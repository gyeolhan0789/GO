import { apiClient } from '../../../shared/api/client';

export type ItemCategory =
  | 'HAT'
  | 'TOP'
  | 'BOTTOM'
  | 'SHOES'
  | 'SUNGLASSES'
  | 'ACCESSORY';

/** 회원이 보유한 아이템 한 개. 장착 아이템 응답도 같은 형태로 내려온다. */
export type MemberItem = {
  memberItemId: number;
  itemId: number;
  name: string;
  category: ItemCategory;
  imageUrl: string;
};

export type EquippedItem = MemberItem;

export type MyCharacterResponse = {
  memberId: number;
  nickname: string;
  /** 성별별 기본 캐릭터 이미지. 관리자가 등록하지 않았으면 null이다. */
  defaultImageUrl: string | null;
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

/** category를 생략하면 보유한 전체 아이템을 내려준다. */
export function getMyItems(category?: ItemCategory) {
  return apiClient.get<MemberItem[]>(
    category ? `/members/items?category=${category}` : '/members/items',
  );
}

/**
 * 장착 아이템 전체 교체. 목록에 없는 카테고리는 서버에서 장착 해제되므로,
 * 항상 "저장 시점에 입고 있어야 하는 아이템 전부"를 보내야 한다.
 */
export function saveEquippedItems(memberItemIds: number[]) {
  return apiClient.put<void>('/character-items', { memberItemIds });
}

export function updateMyProfile(request: { nickname: string }) {
  return apiClient.patch<void>('/members/me', request);
}
