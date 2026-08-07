import type { ImageSourcePropType } from 'react-native';

import { resolveImageUrl } from '../../../shared/api/resolveImageUrl';
import type {
  ItemCategory,
  MemberItem,
  MyAvatarResponse,
} from '../api/memberApi';
import { DEFAULT_CHARACTER_IMAGE_BY_GENDER } from '../constants/characterImages';
import { isSupportedItemCategory } from '../constants/itemCategories';

/**
 * 캐릭터 위에 겹쳐 그릴 수 있는 최소 정보. 보유 아이템인지 몰라도 되므로
 * 미리보기와 옷 입히기 로직은 이것만 받는다.
 *
 * 회원은 같은 아이템을 두 번 살 수 없어(`existsByMemberIdAndItemId`) `itemId`
 * 하나로 착용 중인지 비교할 수 있다.
 */
export type CharacterLayer = {
  itemId: number;
  category: ItemCategory;
  image: ImageSourcePropType | null;
};

/** 회원이 보유한 아이템. 이미지 출처(서버 URL / 번들 에셋)는 여기서 합쳐진다. */
export type CharacterItem = CharacterLayer & {
  memberItemId: number;
  name: string;
};

export type Character = {
  /** 응답에 '나'라는 표시가 없는 화면(산책 상세 등)에서 본인을 가려내는 데 쓴다. */
  memberId: number;
  nickname: string;
  /**
   * 성별 기본 캐릭터. 착용 아이템은 이 이미지 위에 겹친다. 서버에 등록된
   * 이미지가 없으면 성별 번들 에셋으로 채워져 항상 값이 있다.
   */
  baseImage: ImageSourcePropType;
  /** 서버 이미지 URL이 로드에 실패할 때 대신 그릴 성별 번들 에셋. */
  baseImageFallback: ImageSourcePropType;
  equippedItems: CharacterItem[];
};

export function toImageSource(
  url: string | null,
): ImageSourcePropType | null {
  const uri = resolveImageUrl(url);

  return uri ? { uri } : null;
}

export function toCharacterItem(item: MemberItem): CharacterItem {
  return {
    memberItemId: item.memberItemId,
    itemId: item.itemId,
    name: item.name,
    category: item.category,
    image: toImageSource(item.imageUrl),
  };
}

/**
 * 응답의 아이템 목록을 화면이 쓰는 모양으로 옮긴다.
 *
 * 앱이 다루지 않는 카테고리(신발·안경)는 여기서 버린다 — 서버 enum이 더 넓어서
 * 그대로 흘리면 겹쳐 그리는 순서와 썸네일 규격에서 자리를 못 찾는다. 버리는 편이
 * 안 그려지는 아이템 하나로 끝나고, 통과시키면 화면이 깨진다.
 */
export function toCharacterItems(items: MemberItem[]): CharacterItem[] {
  return items
    .filter(item => isSupportedItemCategory(item.category))
    .map(toCharacterItem);
}

export function toCharacter(response: MyAvatarResponse): Character {
  const fallback = DEFAULT_CHARACTER_IMAGE_BY_GENDER[response.gender];

  return {
    memberId: response.memberId,
    nickname: response.nickname,
    baseImage: toImageSource(response.defaultImageUrl) ?? fallback,
    baseImageFallback: fallback,
    equippedItems: toCharacterItems(response.equippedItems),
  };
}
