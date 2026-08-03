import { apiClient } from '../../../shared/api/client';
import type { Gender } from '../../auth/constants/genders';
import type { Region } from '../../auth/constants/regions';

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

export type MyAvatarResponse = {
  memberId: number;
  nickname: string;
  gender: Gender;
  /** 성별별 기본 캐릭터 이미지. 관리자가 등록하지 않았으면 null이다. */
  defaultImageUrl: string | null;
  equippedItems: EquippedItem[];
};

export type PointResponse = {
  point: number;
};

export type MyPageResponse = {
  id: number;
  email: string;
  nickname: string;
  gender: Gender;
  region: Region;
  point: number;
};

export function getMyAvatar() {
  return apiClient.get<MyAvatarResponse>('/members/avatar');
}

export function getMyPage() {
  return apiClient.get<MyPageResponse>('/members/me');
}

export function getMyPoint() {
  return apiClient.get<PointResponse>('/members/point');
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
  return apiClient.put<void>('/avatar-items', { memberItemIds });
}

export type ProfileUpdateRequest = {
  nickname?: string;
  region?: Region;
  gender?: Gender;
};

/**
 * 보낸 항목만 바뀐다(서버가 null인 필드는 건너뛴다).
 *
 * `accessToken`은 아직 세션을 시작하지 않은 소셜 가입 마무리에서만 넘긴다.
 * 그 외에는 생략해서 저장된 토큰을 쓴다.
 */
export function updateMyProfile(
  request: ProfileUpdateRequest,
  options?: { accessToken?: string },
) {
  return apiClient.patch<void>('/members/me', request, options);
}
