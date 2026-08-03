/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ShopScreen } from '../src/screens/ShopScreen/ShopScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const OWNED_HAT = {
  itemId: 1,
  name: '밀짚모자',
  category: 'HAT',
  price: 200,
  imageUrl: '/uploads/items/straw-hat.png',
};
const CHEAP_HAT = {
  itemId: 2,
  name: '리본삔',
  category: 'HAT',
  price: 400,
  imageUrl: '/uploads/items/ribbon-pin.png',
};
const EXPENSIVE_HAT = {
  itemId: 3,
  name: '노을삔',
  category: 'HAT',
  price: 9000,
  imageUrl: null,
};
const TOP = {
  itemId: 4,
  name: '초록 후드',
  category: 'TOP',
  price: 300,
  imageUrl: '/uploads/items/green-hoodie.png',
};

const MY_HAT = {
  memberItemId: 10,
  itemId: OWNED_HAT.itemId,
  name: OWNED_HAT.name,
  category: 'HAT',
  imageUrl: OWNED_HAT.imageUrl,
};

const CHARACTER = {
  memberId: 1,
  nickname: '산책이 좋아',
  gender: 'MALE',
  defaultImageUrl: '/uploads/characters/male.png',
  equippedItems: [MY_HAT],
};

const CASH = 4000;
const PURCHASE = {
  memberItemId: 11,
  itemId: CHEAP_HAT.itemId,
  remainingCash: CASH - CHEAP_HAT.price,
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes('/members/character')) {
      return jsonResponse(200, CHARACTER);
    }
    if (url.includes('/members/cash')) {
      return jsonResponse(200, { cash: CASH });
    }
    if (url.includes('/members/items')) {
      return jsonResponse(200, [MY_HAT] as never);
    }
    if (url.includes('/purchase')) {
      return jsonResponse(201, PURCHASE);
    }
    if (url.includes('/shop/items')) {
      return jsonResponse(200, [
        OWNED_HAT,
        CHEAP_HAT,
        EXPENSIVE_HAT,
        TOP,
      ] as never);
    }
    throw new Error(`unexpected request: ${url}`);
  });
});

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
  // 안 비우면 react-query gc 타이머가 살아남아 워커가 안 죽는다.
  queryClient?.clear();
  queryClient = null;
});

/** react-query는 알림을 setTimeout으로 모아 보내서 타이머까지 흘려보내야 한다. */
async function flushQueries() {
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });
}

function collectTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    .filter((child): child is string => typeof child === 'string');
}

function findByAccessibilityLabel(root: ReactTestInstance, label: string) {
  return root.find(node => node.props.accessibilityLabel === label);
}

async function press(root: ReactTestInstance, label: string) {
  await act(async () => {
    findByAccessibilityLabel(root, label).props.onPress();
  });
  await flushQueries();
}

async function renderScreen() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      // `QueryClient.clear()`는 mutation의 gc 타이머를 정리하지 않는다. 언마운트
      // 때 걸리는 기본 5분 타이머를 0으로 줄여 워커가 매달려 있지 않게 한다.
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const client = queryClient;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <ShopScreen />
        </SafeAreaProvider>
      </QueryClientProvider>,
    );
  });

  await flushQueries();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

function purchaseRequests() {
  return fetchMock.mock.calls.filter(([url]) => url.includes('/purchase'));
}

function itemGrid(root: ReactTestInstance) {
  const [list] = root.findAll(
    node => typeof node.props.onScroll === 'function' && !!node.props.data,
  );

  if (!list) {
    throw new Error('아이템 목록을 찾지 못했다.');
  }
  return list;
}

/** 테스트 렌더러는 실제 스크롤을 못 하므로 onScroll을 직접 쏜다. */
async function scrollTo(root: ReactTestInstance, offsetY: number) {
  await act(async () => {
    itemGrid(root).props.onScroll({
      nativeEvent: { contentOffset: { y: offsetY } },
    });
  });
}

/**
 * accessibilityLabel은 Fab -> Pressable -> View로 그대로 내려가 한 버튼이 여러
 * 노드로 잡힌다. 개수를 세면 구조가 바뀔 때마다 깨지므로 유무만 본다.
 */
function hasScrollToTopButton(root: ReactTestInstance): boolean {
  return (
    root.findAll(node => node.props.accessibilityLabel === '맨 위로').length > 0
  );
}

describe('ShopScreen', () => {
  test('보유 포인트와 첫 카테고리의 판매 아이템이 보인다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('상점');
    expect(texts).toContain('4,000P');
    expect(texts).toContain('모자 3개');
    expect(texts).toContain(CHEAP_HAT.name);
    expect(texts).not.toContain(TOP.name);
  });

  test('보유한 아이템은 가격 대신 보유/착용 상태로 보인다', async () => {
    const tree = await renderScreen();

    expect(
      findByAccessibilityLabel(tree.root, `${OWNED_HAT.name} 착용중`),
    ).toBeTruthy();
    expect(collectTexts(tree.root)).not.toContain('200P');
    expect(
      findByAccessibilityLabel(tree.root, `${CHEAP_HAT.name} 구매 400P`),
    ).toBeTruthy();
  });

  test('카테고리를 바꾸면 그 카테고리 아이템만 보인다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      tree.root
        .find(
          node =>
            node.props.accessibilityRole === 'tab' &&
            node.props.children?.props?.children === '상의',
        )
        .props.onPress();
    });

    const texts = collectTexts(tree.root);
    expect(texts).toContain('상의 1개');
    expect(texts).toContain(TOP.name);
    expect(texts).not.toContain(CHEAP_HAT.name);
  });

  test('미보유 아이템을 누르면 구매 없이 입어보기만 된다', async () => {
    const tree = await renderScreen();

    await press(tree.root, `${CHEAP_HAT.name} 착용해보기`);

    expect(purchaseRequests()).toHaveLength(0);
    expect(collectTexts(tree.root)).toContain('4,000P');
    expect(
      findByAccessibilityLabel(tree.root, `${CHEAP_HAT.name} 구매 400P`),
    ).toBeTruthy();
    expect(
      findByAccessibilityLabel(tree.root, `${CHEAP_HAT.name} 착용중`),
    ).toBeTruthy();
  });

  test('가격 버튼만 눌러도 구매되지 않고, 확인해야 요청이 나간다', async () => {
    const tree = await renderScreen();

    await press(tree.root, `${CHEAP_HAT.name} 구매 400P`);

    expect(purchaseRequests()).toHaveLength(0);
    expect(collectTexts(tree.root)).toContain(
      `${CHEAP_HAT.name}을 구매하시겠습니까?`,
    );

    await press(tree.root, `${CHEAP_HAT.name} 구매 확인`);

    const [[url, options]] = purchaseRequests();
    expect(url).toContain(`/shop/items/${CHEAP_HAT.itemId}/purchase`);
    expect(options?.method).toBe('POST');

    const texts = collectTexts(tree.root);
    expect(texts).toContain('3,600P');
    expect(texts).not.toContain('400P');
    expect(
      findByAccessibilityLabel(tree.root, `${CHEAP_HAT.name} 착용중`),
    ).toBeTruthy();
  });

  test('구매 확인에서 취소하면 요청이 나가지 않는다', async () => {
    const tree = await renderScreen();

    await press(tree.root, `${CHEAP_HAT.name} 구매 400P`);
    await press(tree.root, '구매 취소');

    expect(purchaseRequests()).toHaveLength(0);
    expect(collectTexts(tree.root)).toContain('4,000P');
    expect(
      findByAccessibilityLabel(tree.root, `${CHEAP_HAT.name} 구매 400P`),
    ).toBeTruthy();
  });

  test('포인트가 모자라면 확인 모달 없이 안내만 뜬다', async () => {
    const tree = await renderScreen();

    await press(tree.root, `${EXPENSIVE_HAT.name} 구매 9,000P`);

    expect(purchaseRequests()).toHaveLength(0);
    expect(collectTexts(tree.root)).not.toContain(
      `${EXPENSIVE_HAT.name}을 구매하시겠습니까?`,
    );
    expect(collectTexts(tree.root)).toContain('포인트가 부족해요.');
  });

  test('구매가 실패하면 서버 메시지를 보여주고 포인트는 그대로다', async () => {
    fetchMock.mockImplementation(async url => {
      if (url.includes('/members/character')) {
        return jsonResponse(200, CHARACTER);
      }
      if (url.includes('/members/cash')) {
        return jsonResponse(200, { cash: CASH });
      }
      if (url.includes('/members/items')) {
        return jsonResponse(200, [MY_HAT] as never);
      }
      if (url.includes('/purchase')) {
        return jsonResponse(400, { message: '이미 보유한 아이템입니다.' });
      }
      return jsonResponse(200, [CHEAP_HAT] as never);
    });
    const tree = await renderScreen();

    await press(tree.root, `${CHEAP_HAT.name} 구매 400P`);
    await press(tree.root, `${CHEAP_HAT.name} 구매 확인`);

    const texts = collectTexts(tree.root);
    expect(texts).toContain('이미 보유한 아이템입니다.');
    expect(texts).toContain('4,000P');
    expect(
      findByAccessibilityLabel(tree.root, `${CHEAP_HAT.name} 구매 400P`),
    ).toBeTruthy();
  });

  test('필터로 구매 / 미구매 아이템을 나눠 볼 수 있다', async () => {
    const tree = await renderScreen();

    await press(tree.root, '필터 전체');

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

    const texts = collectTexts(tree.root);
    expect(texts).toContain('모자 1개');
    expect(texts).toContain(OWNED_HAT.name);
    expect(texts).not.toContain(CHEAP_HAT.name);
  });

  test('착용 아이템 초기화를 누르면 모든 착용이 해제된다', async () => {
    const tree = await renderScreen();

    await press(tree.root, '착용 아이템 초기화');

    expect(collectTexts(tree.root)).not.toContain('착용중');
  });

  test('한참 내려가면 맨 위로 버튼이 나왔다가, 올라오면 사라진다', async () => {
    const tree = await renderScreen();
    expect(hasScrollToTopButton(tree.root)).toBe(false);

    await scrollTo(tree.root, 900);
    expect(hasScrollToTopButton(tree.root)).toBe(true);

    await scrollTo(tree.root, 0);
    expect(hasScrollToTopButton(tree.root)).toBe(false);
  });

  test('맨 위로 버튼을 누르면 목록을 처음으로 되돌린다', async () => {
    const tree = await renderScreen();
    await scrollTo(tree.root, 900);

    const scrollToOffset = jest.fn();
    itemGrid(tree.root).instance.scrollToOffset = scrollToOffset;

    await press(tree.root, '맨 위로');

    expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  });

  test('조회가 실패하면 목록 대신 에러 문구를 보여준다', async () => {
    fetchMock.mockImplementation(async url => {
      if (url.includes('/shop/items')) {
        return jsonResponse(500, { message: '상점을 불러올 수 없습니다.' });
      }
      if (url.includes('/members/cash')) {
        return jsonResponse(200, { cash: CASH });
      }
      if (url.includes('/members/character')) {
        return jsonResponse(200, CHARACTER);
      }
      return jsonResponse(200, [MY_HAT] as never);
    });
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain('상점을 불러올 수 없습니다.');
  });
});
