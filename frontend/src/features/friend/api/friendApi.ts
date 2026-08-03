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

export type SentFriendRequest = {
  requestId: number;
  inviteeId: number;
  inviteeNickname: string;
  createdAt: string;
};

/**
 * 내가 보낸 친구 요청. 상대가 아직 수락·거절하지 않은 것만 내려오므로,
 * 여기 남아 있는 항목은 모두 취소할 수 있는 상태다.
 */
export function getSentRequests({
  page = 0,
  size = 20,
}: GetFriendsParams = {}) {
  return apiClient.get<SliceResponse<SentFriendRequest>>(
    `/friend-requests/sent?page=${page}&size=${size}`,
  );
}

/**
 * 내가 보낸 요청을 거둬들인다. 그사이 상대가 응답했으면 409(이미 처리된
 * 친구 요청입니다)가 오므로, 실패하면 목록을 다시 읽어야 한다.
 */
export function cancelFriendRequest(requestId: number) {
  return apiClient.delete<void>(`/friend-requests/${requestId}`);
}
