/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Image, StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import type { ItemCategory } from '../src/features/member/api/memberApi';
import { ItemThumbnail } from '../src/features/member/components/ItemThumbnail';

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
});

function imageStyle(root: ReactTestInstance) {
  return StyleSheet.flatten(root.findByType(Image).props.style) as {
    left?: string;
    top?: string;
    width?: string;
    height?: string;
  };
}

/** '150%' → 150 */
function toNumber(value: string | undefined) {
  const parsed = Number.parseFloat(String(value));
  if (Number.isNaN(parsed)) {
    throw new Error(`퍼센트 값이 아니다: ${value}`);
  }
  return parsed;
}

function renderThumbnail(category: ItemCategory) {
  act(() => {
    renderer = ReactTestRenderer.create(
      <ItemThumbnail source={{ uri: 'https://example.com/item.png' }} category={category} />,
    );
  });
  if (!renderer) {
    throw new Error('renderer가 생성되지 않았습니다.');
  }
  return renderer.root;
}

describe('ItemThumbnail', () => {
  // 창의 가로 기준점은 캔버스 정중앙에서 1.5%(512px에서 8px) 이상 벗어나지 않는다.
  // 에셋이 정중앙보다 조금 왼쪽에 그려져 있어 그만큼만 상쇄한다. 예전에는 캐릭터
  // 몸통 범위의 중심(0.52, 정중앙에서 1.75%)을 기준으로 잡아 그림이 카드 안에서
  // 눈에 띄게 왼쪽으로 치우쳤다.
  it.each<ItemCategory>(['HAT', 'TOP', 'BOTTOM', 'ACCESSORY'])(
    '%s 창을 에셋 중심(캔버스 정중앙 근처)에 둔다',
    category => {
      const style = imageStyle(renderThumbnail(category));
      // left = (0.5 - zoom * centerX) * 100, width = zoom * 100 이므로 되돌린다.
      const zoom = toNumber(style.width) / 100;
      const centerX = (0.5 - toNumber(style.left) / 100) / zoom;

      expect(Math.abs(centerX - 0.5)).toBeLessThanOrEqual(0.015);
    },
  );

  it('에셋이 왼쪽으로 그려진 카테고리는 그만큼 창을 오른쪽으로 민다', () => {
    // 상의·하의 PNG는 캔버스 정중앙보다 2~4px 왼쪽에 그림이 있다(원본 실측).
    // 창을 정중앙에 두면 카드 안에서 그림이 왼쪽으로 치우쳐 보인다.
    for (const category of ['TOP', 'BOTTOM'] as ItemCategory[]) {
      const style = imageStyle(renderThumbnail(category));
      const centered = (100 - toNumber(style.width)) / 2;

      expect(toNumber(style.left)).toBeGreaterThan(centered);
      act(() => {
        renderer?.unmount();
        renderer = null;
      });
    }
  });

  it('카테고리마다 확대율을 달리해 보이는 크기를 맞춘다', () => {
    // 같은 배율을 쓰면 모자가 하의보다 두 배 넘게 커 보인다(에셋이 캔버스에서
    // 차지하는 크기가 달라서다).
    const hat = toNumber(imageStyle(renderThumbnail('HAT')).width);
    act(() => {
      renderer?.unmount();
      renderer = null;
    });
    const bottom = toNumber(imageStyle(renderThumbnail('BOTTOM')).width);

    expect(bottom).toBeGreaterThan(hat);
  });

  it('세로는 카테고리마다 다른 위치를 잡는다', () => {
    // 모자는 머리 위, 하의는 허리 아래라 같은 창을 쓸 수 없다.
    const hat = imageStyle(renderThumbnail('HAT')).top;
    act(() => {
      renderer?.unmount();
      renderer = null;
    });
    const bottom = imageStyle(renderThumbnail('BOTTOM')).top;

    expect(hat).not.toBe(bottom);
  });
});
