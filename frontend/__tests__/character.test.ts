/**
 * @format
 */

import type { MyAvatarResponse } from '../src/features/member/api/memberApi';
import { DEFAULT_CHARACTER_IMAGE_BY_GENDER } from '../src/features/member/constants/characterImages';
import { toCharacter } from '../src/features/member/model/character';

const RESPONSE: MyAvatarResponse = {
  memberId: 1,
  nickname: '산책이 좋아',
  gender: 'MALE',
  defaultImageUrl: '/uploads/characters/male.png',
  equippedItems: [
    {
      memberItemId: 10,
      itemId: 1,
      name: '밀짚모자',
      category: 'HAT',
      imageUrl: 'https://cdn.example.com/items/straw-hat.png',
    },
  ],
};

describe('캐릭터 응답 변환', () => {
  test('서버 상대 경로에는 API 주소를 붙이고 절대 URL은 그대로 쓴다', () => {
    const character = toCharacter(RESPONSE);

    expect(character.baseImage).toEqual({
      uri: 'http://localhost:8080/uploads/characters/male.png',
    });
    expect(character.equippedItems[0].image).toEqual({
      uri: 'https://cdn.example.com/items/straw-hat.png',
    });
  });

  test('기본 캐릭터 이미지가 등록되지 않았으면 성별 번들 에셋으로 대체한다', () => {
    const character = toCharacter({ ...RESPONSE, defaultImageUrl: null });

    expect(character.baseImage).toBe(DEFAULT_CHARACTER_IMAGE_BY_GENDER.MALE);
    expect(character.nickname).toBe(RESPONSE.nickname);
  });
});
