/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Image, StyleSheet, View } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { MemberAvatar } from '../src/features/member/components/MemberAvatar';

/** 아래에 깔리는 기본 캐릭터가 첫 레이어다. */
function baseLayerSource(root: ReactTestInstance) {
  return root.findAllByType(Image)[0]?.props.source;
}

function render(element: React.ReactElement) {
  // 콜백 안에서 대입하면 지역 변수는 타입이 never로 좁혀져서 홀더에 담는다.
  const holder: { current?: ReactTestRenderer.ReactTestRenderer } = {};

  act(() => {
    holder.current = ReactTestRenderer.create(element);
  });
  if (!holder.current) {
    throw new Error('renderer not initialized');
  }
  return holder.current;
}

describe('흉상 크롭', () => {
  /** 512x512 캔버스에서 흉상이 차지하는 창(가로·세로 절반, 세로는 y 0.137부터). */
  const CANVAS_CROP = { size: 0.5, y: 0.137 };
  /** 캔버스 안에서 그림이 놓인 가로 중심(에셋 실측). CharacterBust와 같은 값. */
  const ARTWORK_CENTER_X = 0.508;

  function layerBoxStyle(root: ReactTestInstance) {
    // 레이어를 담은 상자. 이미지들이 이 상자를 100%로 채운다.
    const box = root
      .findAllByType(View)
      .map(node => StyleSheet.flatten(node.props.style))
      .find(
        style =>
          typeof (style as { width?: unknown })?.width === 'string' &&
          (style as { position?: string }).position === 'absolute',
      );

    if (!box) {
      throw new Error('흉상 레이어 상자를 못 찾았다');
    }
    return box as {
      width: string;
      aspectRatio: number;
      top: string;
      left?: string;
      transform: { translateX: string }[];
    };
  }

  /** 창 역할을 하는 바깥 상자. 흉상의 가로 자리를 잡는다. */
  function frameStyle(root: ReactTestInstance) {
    return StyleSheet.flatten(
      root.findAllByType(View)[0].props.style,
    ) as { alignItems?: string };
  }

  test('캔버스의 머리~허리 구간만 창에 남긴다', () => {
    const tree = render(
      <MemberAvatar gender="MALE" defaultImageUrl={null} equippedItems={[]} />,
    );
    const box = layerBoxStyle(tree.root);

    const zoom = parseFloat(box.width) / 100;
    // 창이 캔버스의 이만큼만 보여준다. 1이면 전신이라 자른 게 아니다.
    expect(1 / zoom).toBeCloseTo(CANVAS_CROP.size, 2);
    // 상자가 정사각이 아니어도 캔버스 비율이 유지돼야 레이어가 안 어긋난다.
    expect(box.aspectRatio).toBe(1);

    // 오프셋은 확대된 상자 기준이라 zoom을 나눠야 캔버스 좌표가 된다.
    expect(-parseFloat(box.top) / 100 / zoom).toBeCloseTo(CANVAS_CROP.y, 2);
  });

  test('그림이 캔버스 중앙에서 벗어난 만큼 되밀어 가운데 맞춘다', () => {
    const tree = render(
      <MemberAvatar gender="MALE" defaultImageUrl={null} equippedItems={[]} />,
    );
    const box = layerBoxStyle(tree.root);

    // 가로는 상자가 flex로 잡는다. left를 두면 그 정렬이 무시된다.
    expect(frameStyle(tree.root).alignItems).toBe('center');
    expect(box.left).toBeUndefined();

    // flex는 그림이 아니라 캔버스를 가운데 놓는다. 남은 차이를 translateX가
    // 지운다 — 이게 없으면 흉상이 그림이 치우친 쪽으로 쏠려 보인다.
    const shift = parseFloat(box.transform[0].translateX) / 100;
    expect(0.5 - shift).toBeCloseTo(ARTWORK_CENTER_X, 3);
  });

  test('창을 넘는 몸통은 잘라낸다', () => {
    const tree = render(
      <MemberAvatar gender="MALE" defaultImageUrl={null} equippedItems={[]} />,
    );

    // overflow를 빼면 확대된 전신이 줄 밖으로 삐져나온다.
    const clips = tree.root
      .findAllByType(View)
      .map(node => StyleSheet.flatten(node.props.style))
      .some(style => (style as { overflow?: string })?.overflow === 'hidden');
    expect(clips).toBe(true);
  });

  test('시상대는 전신을 그대로 세운다', () => {
    const tree = render(
      <MemberAvatar
        gender="MALE"
        defaultImageUrl={null}
        equippedItems={[]}
        variant="full"
      />,
    );

    // 확대·이동이 없어야 단 위에 선 모습이 유지된다.
    expect(() => layerBoxStyle(tree.root)).toThrow();
  });
});

describe('회원 아바타 기본 캐릭터', () => {
  test('서버가 준 경로를 절대 URL로 만들어 쓴다', () => {
    const tree = render(
      <MemberAvatar
        gender="FEMALE"
        defaultImageUrl="/uploads/character-female.png"
        equippedItems={[]}
      />,
    );

    // RN Image에는 기준 주소가 없어 상대 경로를 그대로 넘기면 안 그려진다.
    expect(baseLayerSource(tree.root)).toEqual({
      uri: expect.stringContaining('/uploads/character-female.png'),
    });
    expect(baseLayerSource(tree.root).uri).toMatch(/^https?:\/\//);
  });

  test('경로가 없으면 성별에 맞는 번들 에셋으로 그린다', () => {
    const male = render(
      <MemberAvatar gender="MALE" defaultImageUrl={null} equippedItems={[]} />,
    );
    const female = render(
      <MemberAvatar
        gender="FEMALE"
        defaultImageUrl={null}
        equippedItems={[]}
      />,
    );

    // 번들 에셋은 uri가 아니라 모듈 참조다.
    expect(baseLayerSource(male.root)).not.toHaveProperty('uri');
    // 예전에는 전원 남성 에셋으로 그려서 여성 회원이 남자로 보였다.
    expect(baseLayerSource(female.root)).not.toEqual(
      baseLayerSource(male.root),
    );
  });

  test('서버 이미지 로드에 실패하면 성별 번들 에셋으로 대체한다', () => {
    // dev의 /uploads 서빙 장애처럼, URL은 내려왔는데 파일이 안 열리는 상황.
    const tree = render(
      <MemberAvatar
        gender="MALE"
        defaultImageUrl="/uploads/broken.png"
        equippedItems={[]}
      />,
    );

    expect(baseLayerSource(tree.root)).toHaveProperty('uri');

    act(() => {
      tree.root.findAllByType(Image)[0].props.onError();
    });

    expect(baseLayerSource(tree.root)).not.toHaveProperty('uri');
  });

  test('착용 아이템을 기본 캐릭터 위에 겹친다', () => {
    const tree = render(
      <MemberAvatar
        gender="MALE"
        defaultImageUrl={null}
        equippedItems={[
          {
            memberItemId: 1,
            itemId: 101,
            name: '썬캡',
            category: 'HAT',
            imageUrl: '/uploads/hat.png',
          },
        ]}
      />,
    );

    const layers = tree.root.findAllByType(Image);
    expect(layers).toHaveLength(2);
    expect(layers[1].props.source).toEqual({
      uri: expect.stringContaining('/uploads/hat.png'),
    });
  });

  test('여러 카테고리를 끼고 있으면 정해진 순서로 겹친다', () => {
    // 로컬 시드의 test-user가 이 조합이다. 넘기는 순서는 일부러 섞어 둔다.
    const tree = render(
      <MemberAvatar
        gender="MALE"
        defaultImageUrl={null}
        equippedItems={[
          {
            memberItemId: 1,
            itemId: 201,
            name: 'Blue Cap',
            category: 'HAT',
            imageUrl: '/uploads/hat.png',
          },
          {
            memberItemId: 2,
            itemId: 202,
            name: 'Green Top',
            category: 'TOP',
            imageUrl: '/uploads/top.png',
          },
          {
            memberItemId: 5,
            itemId: 205,
            name: 'Gold Ring',
            category: 'ACCESSORY',
            imageUrl: '/uploads/ring.png',
          },
          {
            memberItemId: 3,
            itemId: 203,
            name: 'Black Pants',
            category: 'BOTTOM',
            imageUrl: '/uploads/pants.png',
          },
        ]}
      />,
    );

    const sources = tree.root
      .findAllByType(Image)
      .map(image => image.props.source);

    // 기본 캐릭터 + 아이템 4개.
    expect(sources).toHaveLength(5);
    // 상의가 하의 허리선을, 모자가 그 위를 덮는 순서여야 한다.
    expect(sources.slice(1).map(source => source.uri.split('/').pop())).toEqual([
      'pants.png',
      'top.png',
      'ring.png',
      'hat.png',
    ]);
  });

  test('앱이 다루지 않는 카테고리는 그리지 않는다', () => {
    // 서버 enum에는 신발·안경이 남아 있어 응답에 섞여 올 수 있다. 겹쳐 그리는
    // 순서와 썸네일 규격에 자리가 없으므로 통과시키면 안 된다.
    const tree = render(
      <MemberAvatar
        gender="MALE"
        defaultImageUrl={null}
        equippedItems={[
          {
            memberItemId: 1,
            itemId: 201,
            name: 'Blue Cap',
            category: 'HAT',
            imageUrl: '/uploads/hat.png',
          },
          {
            memberItemId: 4,
            itemId: 204,
            name: 'White Shoes',
            // 타입에는 없는 값이 응답으로 오는 상황이다.
            category: 'SHOES' as never,
            imageUrl: '/uploads/shoes.png',
          },
        ]}
      />,
    );

    const sources = tree.root
      .findAllByType(Image)
      .map(image => image.props.source);

    // 기본 캐릭터 + 모자만.
    expect(sources).toHaveLength(2);
    expect(sources[1].uri).toContain('/uploads/hat.png');
  });

  test('같은 카테고리가 겹쳐 오면 하나만 그린다', () => {
    const tree = render(
      <MemberAvatar
        gender="MALE"
        defaultImageUrl={null}
        equippedItems={[
          {
            memberItemId: 1,
            itemId: 201,
            name: 'Blue Cap',
            category: 'HAT',
            imageUrl: '/uploads/cap.png',
          },
          {
            memberItemId: 2,
            itemId: 202,
            name: 'Straw Hat',
            category: 'HAT',
            imageUrl: '/uploads/straw.png',
          },
        ]}
      />,
    );

    expect(tree.root.findAllByType(Image)).toHaveLength(2);
  });

  test('아이템이 안 내려온 배포에서도 기본 캐릭터는 그린다', () => {
    const tree = render(
      <MemberAvatar
        gender="MALE"
        defaultImageUrl={null}
        equippedItems={undefined}
      />,
    );

    expect(tree.root.findAllByType(Image)).toHaveLength(1);
  });

  test('성별도 기본 이미지도 없으면 흉상 확대 없이 아이콘 자리만 남긴다', () => {
    // 친구 목록처럼 응답에 캐릭터 정보가 없는 곳. 확대·이동을 걸면 가운데
    // 그려질 아이콘이 원 밖으로 밀려나 잘려 보인다.
    const tree = render(
      <MemberAvatar
        defaultImageUrl={null}
        equippedItems={[
          {
            memberItemId: 1,
            itemId: 201,
            name: 'Blue Cap',
            category: 'HAT',
            imageUrl: '/uploads/cap.png',
          },
        ]}
      />,
    );

    const hasZoomedBox = tree.root
      .findAllByType(View)
      .map(node => StyleSheet.flatten(node.props.style))
      .some(
        style =>
          typeof (style as { width?: unknown })?.width === 'string' &&
          (style as { position?: string }).position === 'absolute',
      );
    expect(hasZoomedBox).toBe(false);
    // 몸통 없이 옷만 떠 있지 않도록 아이템도 그리지 않는다.
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });
});
