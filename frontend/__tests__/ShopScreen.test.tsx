/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ShopScreen } from '../src/screens/ShopScreen/ShopScreen';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
});

function collectTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    .filter((child): child is string => typeof child === 'string');
}

async function renderScreen() {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <ShopScreen />
      </SafeAreaProvider>,
    );
  });
  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

function findByAccessibilityLabel(root: ReactTestInstance, label: string) {
  return root.find(node => node.props.accessibilityLabel === label);
}

describe('ShopScreen', () => {
  test('상의 탭이 기본으로 열리고 보유 포인트가 노출된다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('상점');
    expect(texts).toContain('4,000P');
    expect(texts).toContain('상의 5개');
    expect(texts).toContain('초록 후드');
  });

  test('카테고리를 바꾸면 해당 카테고리 아이템만 보인다', async () => {
    const tree = await renderScreen();

    const tabs = tree.root.findAll(
      node =>
        node.props.accessibilityRole === 'tab' &&
        typeof node.props.onPress === 'function',
    );
    await act(async () => {
      tabs[tabs.length - 1].props.onPress();
    });

    const texts = collectTexts(tree.root);
    expect(texts).toContain('모자 6개');
    expect(texts).toContain('리본삔');
    expect(texts).not.toContain('초록 후드');
  });

  test('아이템을 누르면 그 아이템으로 갈아입는다', async () => {
    const tree = await renderScreen();

    // 초록 후드는 목업에서 착용 중으로 시작한다.
    await act(async () => {
      findByAccessibilityLabel(tree.root, '줄무늬 티 착용해보기').props.onPress();
    });

    expect(findByAccessibilityLabel(tree.root, '줄무늬 티 착용중')).toBeTruthy();
    expect(
      findByAccessibilityLabel(tree.root, '초록 후드 착용해보기'),
    ).toBeTruthy();
  });

  test('착용 중인 아이템을 다시 눌러도 벗겨지지 않는다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '초록 후드 착용중').props.onPress();
    });

    // 벗기는 '착용 아이템 초기화'가 담당한다. 슬롯이 비면 안 된다.
    expect(findByAccessibilityLabel(tree.root, '초록 후드 착용중')).toBeTruthy();
    expect(collectTexts(tree.root)).toContain('착용중');
  });

  test('미보유 아이템은 눌러도 구매되지 않고 입어보기만 된다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '크림 니트 착용해보기').props.onPress();
    });

    // 포인트는 그대로고, 가격 버튼도 그대로 남아 있어야 한다.
    expect(collectTexts(tree.root)).toContain('4,000P');
    expect(findByAccessibilityLabel(tree.root, '크림 니트 구매 600P')).toBeTruthy();
    expect(findByAccessibilityLabel(tree.root, '크림 니트 착용중')).toBeTruthy();

    // 다른 아이템으로 갈아입어도 미보유 아이템 버튼이 회색으로 굳지 않는다.
    await act(async () => {
      findByAccessibilityLabel(tree.root, '숲속 후드 착용해보기').props.onPress();
    });
    expect(findByAccessibilityLabel(tree.root, '크림 니트 구매 600P')).toBeTruthy();
  });

  test('가격 버튼을 누르면 구매 확인 모달이 뜨고, 확인해야 구매된다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '크림 니트 구매 600P').props.onPress();
    });

    // 모달만 떴을 뿐 아직 차감되지 않는다.
    expect(collectTexts(tree.root)).toContain('크림 니트를 구매하시겠습니까?');
    expect(collectTexts(tree.root)).toContain('4,000P');

    await act(async () => {
      findByAccessibilityLabel(tree.root, '크림 니트 구매 확인').props.onPress();
    });

    const texts = collectTexts(tree.root);
    expect(texts).toContain('3,400P');
    expect(texts).toContain('착용중');
    expect(findByAccessibilityLabel(tree.root, '크림 니트 착용중')).toBeTruthy();
  });

  test('구매 확인 모달에서 취소하면 포인트가 그대로다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '크림 니트 구매 600P').props.onPress();
    });
    await act(async () => {
      findByAccessibilityLabel(tree.root, '구매 취소').props.onPress();
    });

    const texts = collectTexts(tree.root);
    expect(texts).toContain('4,000P');
    expect(texts).not.toContain('크림 니트를 구매하시겠습니까?');
    expect(findByAccessibilityLabel(tree.root, '크림 니트 구매 600P')).toBeTruthy();
  });

  test('필터로 구매 / 미구매 아이템을 나눠 볼 수 있다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '필터 전체').props.onPress();
    });

    const options = tree.root.findAll(
      node =>
        node.props.accessibilityRole === 'menuitem' &&
        typeof node.props.onPress === 'function',
    );
    // 전체 / 구매한 아이템 / 미구매 아이템
    expect(options).toHaveLength(3);

    await act(async () => {
      options[1].props.onPress();
    });

    // 상의 5개 중 목업에서 보유한 건 2개.
    const texts = collectTexts(tree.root);
    expect(texts).toContain('상의 2개');
    expect(texts).not.toContain('크림 니트');
  });

  test('착용 아이템 초기화를 누르면 모든 착용이 해제된다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findByAccessibilityLabel(tree.root, '착용 아이템 초기화').props.onPress();
    });

    expect(collectTexts(tree.root)).not.toContain('착용중');
  });
});
