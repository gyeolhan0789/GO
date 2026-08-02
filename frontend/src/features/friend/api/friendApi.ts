import { apiClient } from '../../../shared/api/client';
import type { Gender } from '../../auth/constants/genders';

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
  /**
   * 백엔드 FriendResponse에 아직 없는 필드(추가 요청 예정). 내려오기 시작하면
   * 친구 아바타의 기본 캐릭터가 랭킹처럼 채워진다. 그 전까지는 undefined.
   */
  gender?: Gender;
  defaultImageUrl?: string | null;
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

/** friendId는 친구 관계 row의 ID가 아니라 삭제하려는 상대의 memberId다. */
export function deleteFriend(friendId: number) {
  return apiClient.delete<void>(`/friends/${friendId}`);
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

export type ReceivedFriendRequest = {
  requestId: number;
  inviterId: number;
  inviterNickname: string;
  createdAt: string;
};

export function getReceivedRequests({
  page = 0,
  size = 20,
}: GetFriendsParams = {}) {
  return apiClient.get<SliceResponse<ReceivedFriendRequest>>(
    `/friend-requests?page=${page}&size=${size}`,
  );
}

export function acceptFriendRequest(requestId: number) {
  return apiClient.patch<void>(`/friend-requests/${requestId}/accept`);
}

export function rejectFriendRequest(requestId: number) {
  return apiClient.patch<void>(`/friend-requests/${requestId}/reject`);
}
