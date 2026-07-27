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

export type FriendResponse = {
  memberId: number;
  nickname: string;
  /** Asia/Seoul 기준 이번 주 월요일부터 오늘까지의 누적 걸음 수. */
  weeklySteps: number;
  equippedItems: EquippedItem[];
};

export type SliceResponse<T> = {
  content: T[];
  hasNext: boolean;
};

export type GetFriendsParams = {
  page?: number;
  size?: number;
};

export function getFriends({ page = 0, size = 20 }: GetFriendsParams = {}) {
  return apiClient.get<SliceResponse<FriendResponse>>(
    `/friends?page=${page}&size=${size}`,
  );
}

/** 백엔드 MemberRelationshipStatus와 동일. */
export type MemberRelationshipStatus =
  | 'NONE'
  | 'FRIEND'
  | 'REQUEST_SENT'
  | 'REQUEST_RECEIVED';

export type MemberSearchResult = {
  memberId: number;
  nickname: string;
  relationshipStatus: MemberRelationshipStatus;
};

export type SearchMembersParams = {
  keyword: string;
  page?: number;
  size?: number;
};

export function searchMembers({
  keyword,
  page = 0,
  size = 20,
}: SearchMembersParams) {
  return apiClient.get<SliceResponse<MemberSearchResult>>(
    `/members/search?keyword=${encodeURIComponent(
      keyword,
    )}&page=${page}&size=${size}`,
  );
}

export function sendFriendRequest(inviteeId: number) {
  return apiClient.post<void>('/friend-requests', { inviteeId });
}
