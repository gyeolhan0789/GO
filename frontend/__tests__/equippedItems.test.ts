/**
 * @format
 */

import type {
  CharacterItem,
  CharacterLayer,
} from '../src/features/member/model/character';
import {
  hasEquippedItem,
  isEquipped,
  isSameEquipped,
  selectLayerItems,
  toEquippedByCategory,
  toMemberItemIds,
  toggleEquipped,
} from '../src/features/member/model/equippedItems';

function item(
  memberItemId: number,
  category: CharacterItem['category'],
): CharacterItem {
  return {
    memberItemId,
    itemId: memberItemId * 10,
    name: `${category}-${memberItemId}`,
    category,
    image: { uri: `https://cdn.example.com/items/${memberItemId}.png` },
  };
}

const hat = item(1, 'HAT');
const otherHat = item(2, 'HAT');
const top = item(3, 'TOP');
const bottom = item(4, 'BOTTOM');

describe('장착 아이템 모델', () => {
  test('같은 카테고리는 하나만 입고, 기존 착용분은 밀려난다', () => {
    const equipped = toggleEquipped(toggleEquipped({}, hat), otherHat);

    expect(isEquipped(equipped, otherHat)).toBe(true);
    expect(isEquipped(equipped, hat)).toBe(false);
  });

  test('입고 있는 아이템을 다시 누르면 벗는다', () => {
    const equipped = toggleEquipped(toggleEquipped({}, hat), hat);

    expect(isEquipped(equipped, hat)).toBe(false);
    expect(hasEquippedItem(equipped)).toBe(false);
  });

  test('회원 아이템 id가 없어도 겹쳐 입힐 수 있다', () => {
    const layerHat: CharacterLayer = {
      itemId: 901,
      category: 'HAT',
      image: null,
    };
    const layerTop: CharacterLayer = {
      itemId: 902,
      category: 'TOP',
      image: null,
    };
    const equipped = toEquippedByCategory([layerHat, layerTop]);

    expect(isEquipped(equipped, layerHat)).toBe(true);
    expect(selectLayerItems(equipped)).toEqual([layerTop, layerHat]);
  });

  test('겹쳐 그릴 때 하의가 상의 아래, 모자가 가장 위에 온다', () => {
    const equipped = toEquippedByCategory([hat, top, bottom]);

    expect(selectLayerItems(equipped).map(layer => layer.category)).toEqual([
      'BOTTOM',
      'TOP',
      'HAT',
    ]);
  });

  test('저장 요청에는 착용 중인 아이템 전부가 담긴다', () => {
    const equipped = toEquippedByCategory([hat, bottom]);

    expect(toMemberItemIds(equipped)).toEqual([
      bottom.memberItemId,
      hat.memberItemId,
    ]);
  });

  test('아이템을 바꿔 입었다가 되돌리면 저장할 변경이 없다', () => {
    const saved = toEquippedByCategory([hat, top]);
    const changed = toggleEquipped(saved, otherHat);

    expect(isSameEquipped(changed, saved)).toBe(false);
    expect(isSameEquipped(toggleEquipped(changed, hat), saved)).toBe(true);
  });
});
