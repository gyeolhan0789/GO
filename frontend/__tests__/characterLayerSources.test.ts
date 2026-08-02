/**
 * @format
 */

import { Image } from 'react-native';

import type { Character, CharacterItem } from '../src/features/member/model/character';
import { toCharacterLayerSources } from '../src/features/wear/model/characterLayerSources';

// 번들 에셋(require)은 숫자 모듈 ID라 resolveAssetSource를 거쳐야 URI가 된다.
// 서버 아이템은 이미 { uri }다. 워치로는 둘 다 문자열로 나가야 한다.
const BUNDLED_BASE_IMAGE = 1234;

beforeEach(() => {
  jest
    .spyOn(Image, 'resolveAssetSource')
    .mockImplementation(source =>
      typeof source === 'number'
        ? ({ uri: `asset://bundled/${source}` } as ReturnType<
            typeof Image.resolveAssetSource
          >)
        : ({
            uri: (source as { uri?: string }).uri ?? '',
          } as ReturnType<typeof Image.resolveAssetSource>),
    );
});

afterEach(() => {
  jest.restoreAllMocks();
});

function item(
  memberItemId: number,
  category: CharacterItem['category'],
  uri: string,
): CharacterItem {
  return {
    memberItemId,
    itemId: memberItemId * 10,
    name: `${category}-${memberItemId}`,
    category,
    image: { uri },
  };
}

function character(equippedItems: CharacterItem[]): Character {
  return {
    memberId: 1,
    nickname: '산책이 좋아',
    baseImage: BUNDLED_BASE_IMAGE,
    equippedItems,
  };
}

describe('워치로 보낼 캐릭터 레이어', () => {
  test('기본 캐릭터가 맨 아래에 오고 번들 에셋도 URI로 나온다', () => {
    const sources = toCharacterLayerSources(character([]));

    expect(sources).toEqual([`asset://bundled/${BUNDLED_BASE_IMAGE}`]);
  });

  test('장착 아이템은 겹쳐 그릴 순서대로 뒤에 붙는다', () => {
    const sources = toCharacterLayerSources(
      character([
        item(1, 'HAT', 'https://cdn.example.com/hat.png'),
        item(2, 'BOTTOM', 'https://cdn.example.com/bottom.png'),
        item(3, 'TOP', 'https://cdn.example.com/top.png'),
      ]),
    );

    // 모자가 마지막(가장 위)이어야 상의·하의를 덮는다.
    expect(sources).toEqual([
      `asset://bundled/${BUNDLED_BASE_IMAGE}`,
      'https://cdn.example.com/bottom.png',
      'https://cdn.example.com/top.png',
      'https://cdn.example.com/hat.png',
    ]);
  });

  test('이미지가 없는 레이어는 건너뛴다', () => {
    const withoutImage: CharacterItem = {
      ...item(4, 'TOP', ''),
      image: null,
    };

    const sources = toCharacterLayerSources(character([withoutImage]));

    expect(sources).toEqual([`asset://bundled/${BUNDLED_BASE_IMAGE}`]);
  });

  test('기본 캐릭터가 없어도 아이템만으로 보낼 수 있다', () => {
    const sources = toCharacterLayerSources({
      ...character([item(1, 'HAT', 'https://cdn.example.com/hat.png')]),
      baseImage: null,
    });

    expect(sources).toEqual(['https://cdn.example.com/hat.png']);
  });
});
