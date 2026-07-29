import characterFemale from '../assets/character-female.png';
import characterMale from '../assets/character-male.png';
import bottomGraySweatpants from '../assets/bottom-gray-sweatpants.png';
import bottomJeans from '../assets/bottom-jeans.png';
import bottomTrainingPants from '../assets/bottom-training-pants.png';
import hatBread from '../assets/hat-bread.png';
import hatJungle from '../assets/hat-jungle.png';
import hatStraw from '../assets/hat-straw.png';
import hatSuncap from '../assets/hat-suncap.png';
import hatTrooper from '../assets/hat-trooper.png';
import topFleece from '../assets/top-fleece.png';
import topLightPadding from '../assets/top-light-padding.png';
import topSsafyTee from '../assets/top-ssafy-tee.png';
import topTrainingJacket from '../assets/top-training-jacket.png';
import type { Character, CharacterItem } from '../model/character';

/**
 * 캐릭터/아이템을 서버 대신 번들 에셋으로 굴리는 스위치.
 *
 * 서버에는 기본 캐릭터 이미지와 아이템 이미지가 아직 등록되지 않아, 지금은 이
 * 목업으로 옷 입히기를 확인한다. 에셋이 올라가면 `false`로 바꾸면 되고, 그때부터
 * 조회·저장이 모두 실제 API로 나간다(요청 코드는 이미 붙어 있다).
 */
export const USE_MOCK_CHARACTER = true;

/** 목업으로 쓸 성별. 기본 캐릭터 이미지가 이 값으로 갈린다. */
const MOCK_GENDER: 'MALE' | 'FEMALE' = 'MALE';

const BASE_IMAGE_BY_GENDER = {
  MALE: characterMale,
  FEMALE: characterFemale,
} as const;

const MOCK_NICKNAME = '산책이 좋아';

// 실제 응답과 같은 모양으로 둔다(카테고리당 하나만 입을 수 있고, 착용/저장은
// memberItemId로 오간다). 이미지만 서버 URL이 아니라 번들 에셋이다.
export const MOCK_OWNED_ITEMS: CharacterItem[] = [
  {
    memberItemId: 1,
    itemId: 101,
    name: '썬캡',
    category: 'HAT',
    image: hatSuncap,
  },
  {
    memberItemId: 2,
    itemId: 102,
    name: '밀짚모자',
    category: 'HAT',
    image: hatStraw,
  },
  {
    memberItemId: 3,
    itemId: 103,
    name: '빵모자',
    category: 'HAT',
    image: hatBread,
  },
  {
    memberItemId: 4,
    itemId: 104,
    name: '정글모',
    category: 'HAT',
    image: hatJungle,
  },
  {
    memberItemId: 5,
    itemId: 105,
    name: '트루퍼',
    category: 'HAT',
    image: hatTrooper,
  },
  {
    memberItemId: 6,
    itemId: 106,
    name: '싸피티',
    category: 'TOP',
    image: topSsafyTee,
  },
  {
    memberItemId: 7,
    itemId: 107,
    name: '플리스',
    category: 'TOP',
    image: topFleece,
  },
  {
    memberItemId: 8,
    itemId: 108,
    name: '경량패딩',
    category: 'TOP',
    image: topLightPadding,
  },
  {
    memberItemId: 9,
    itemId: 109,
    name: '트레이닝 자켓',
    category: 'TOP',
    image: topTrainingJacket,
  },
  {
    memberItemId: 10,
    itemId: 110,
    name: '청바지',
    category: 'BOTTOM',
    image: bottomJeans,
  },
  {
    memberItemId: 11,
    itemId: 111,
    name: '트레이닝 바지',
    category: 'BOTTOM',
    image: bottomTrainingPants,
  },
  {
    memberItemId: 12,
    itemId: 112,
    name: '회색 츄리닝 바지',
    category: 'BOTTOM',
    image: bottomGraySweatpants,
  },
];

/** 처음 입고 있는 조합. 겹쳐 그리기가 되는지 바로 보이도록 모자+상의를 채운다. */
const MOCK_EQUIPPED_MEMBER_ITEM_IDS = [2, 6];

export function findMockItems(memberItemIds: number[]): CharacterItem[] {
  return memberItemIds
    .map(memberItemId =>
      MOCK_OWNED_ITEMS.find(item => item.memberItemId === memberItemId),
    )
    .filter((item): item is CharacterItem => item != null);
}

export const MOCK_CHARACTER: Character = {
  nickname: MOCK_NICKNAME,
  baseImage: BASE_IMAGE_BY_GENDER[MOCK_GENDER],
  equippedItems: findMockItems(MOCK_EQUIPPED_MEMBER_ITEM_IDS),
};
