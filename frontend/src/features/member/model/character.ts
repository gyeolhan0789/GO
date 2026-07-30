import type { ImageSourcePropType } from 'react-native';

import { resolveImageUrl } from '../../../shared/api/resolveImageUrl';
import type {
  ItemCategory,
  MemberItem,
  MyCharacterResponse,
} from '../api/memberApi';

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
  /** 성별 기본 캐릭터. 착용 아이템은 이 이미지 위에 겹친다. */
  baseImage: ImageSourcePropType | null;
  equippedItems: CharacterItem[];
};

function toImageSource(url: string | null): ImageSourcePropType | null {
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

export function toCharacter(response: MyCharacterResponse): Character {
  return {
    memberId: response.memberId,
    nickname: response.nickname,
    baseImage: toImageSource(response.defaultImageUrl),
    equippedItems: response.equippedItems.map(toCharacterItem),
  };
}
