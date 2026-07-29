import type { ImageSourcePropType } from 'react-native';

import { resolveImageUrl } from '../../../shared/api/resolveImageUrl';
import type {
  ItemCategory,
  MemberItem,
  MyCharacterResponse,
} from '../api/memberApi';

/**
 * 화면이 다루는 아이템 한 개. 이미지 출처(서버 URL / 번들 에셋)를 여기서 하나로
 * 합쳐서, 옷 입히기 로직과 UI가 출처를 몰라도 되게 한다.
 */
export type CharacterItem = {
  memberItemId: number;
  itemId: number;
  name: string;
  category: ItemCategory;
  /** 이미지가 없으면 null. 미리보기와 카드가 각자 빈 자리를 표시한다. */
  image: ImageSourcePropType | null;
};

export type Character = {
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
    nickname: response.nickname,
    baseImage: toImageSource(response.defaultImageUrl),
    equippedItems: response.equippedItems.map(toCharacterItem),
  };
}
