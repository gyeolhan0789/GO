import { apiClient } from '../../../shared/api/client';
import type { Gender } from '../../auth/constants/genders';
import type { Region } from '../../auth/constants/regions';

/**
 * 앱이 다루는 아이템 카테고리.
 *
 * 백엔드 enum(`ItemCategory`)에는 SHOES·SUNGLASSES도 있지만 파는 아이템이 없어
 * 화면·에셋 규격을 갖추지 않았다. 응답에 그 값이 섞여 올 수 있으므로 서버 데이터를
 * 앱 모델로 옮길 때 `isSupportedItemCategory`로 걸러낸다 — 타입을 좁힌 것만으로는
 * 런타임 값이 막히지 않는다.
 */
export type ItemCategory = 'HAT' | 'TOP' | 'BOTTOM' | 'ACCESSORY';

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
};

export function getMyAvatar() {
  return apiClient.get<MyAvatarResponse>('/members/avatar');
}

/**
 * 서버는 point도 함께 내려주지만 여기서 떼고 넘긴다. 이 응답은 거의 바뀌지 않는
 * 값이라 캐시를 오래 들고 있는데, 포인트는 구매·보상으로 자주 바뀌어 옛 값이
 * 남는다. 포인트는 getMyPoint(useMyPointQuery) 한 곳에서만 캐시한다.
 */
export async function getMyPage(): Promise<MyPageResponse> {
  const { id, email, nickname, gender, region } = await apiClient.get<
    MyPageResponse & { point?: number }
  >('/members/me');

  return { id, email, nickname, gender, region };
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
