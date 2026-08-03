/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CharacterCustomizeScreen } from '../src/screens/CharacterCustomizeScreen/CharacterCustomizeScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const HAT = {
  memberItemId: 10,
  itemId: 1,
  name: '파란 모자',
  category: 'HAT',
  imageUrl: '/uploads/items/hat.png',
};
const OTHER_HAT = {
  memberItemId: 11,
  itemId: 2,
  name: '밀짚모자',
  category: 'HAT',
  imageUrl: 'https://cdn.example.com/items/straw-hat.png',
};
const TOP = {
  memberItemId: 12,
  itemId: 3,
  name: '초록 후드',
  category: 'TOP',
  imageUrl: '/uploads/items/top.png',
};

const CHARACTER = {
  memberId: 1,
  nickname: '산책이 좋아',
  gender: 'MALE',
  defaultImageUrl: '/uploads/characters/male.png',
  equippedItems: [HAT],
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
    if (url.includes('/members/items')) {
      return jsonResponse(200, [HAT, OTHER_HAT, TOP] as never);
    }
    if (url.includes('/character-items')) {
      return jsonResponse(204);
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

/**
 * 공용 `Button`은 접근성 라벨 대신 자식 Text로 이름을 드러낸다. 그 Text에서
 * 위로 올라가 실제로 눌리는 노드를 찾는다.
 */
function findButtonByText(root: ReactTestInstance, text: string) {
  let current: ReactTestInstance | null = root.find(
    node => node.type === Text && node.props.children === text,
  ).parent;

  while (current) {
    if (typeof current.props.onPress === 'function') {
      return current;
    }
    current = current.parent;
  }

  throw new Error(`${text} 버튼을 찾지 못했다.`);
}

async function press(root: ReactTestInstance, label: string) {
  await act(async () => {
    findByAccessibilityLabel(root, label).props.onPress();
  });
  await flushQueries();
}

async function pressButton(root: ReactTestInstance, text: string) {
  await act(async () => {
    findButtonByText(root, text).props.onPress();
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
          <CharacterCustomizeScreen />
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

function savedMemberItemIds() {
  const [, options] =
    fetchMock.mock.calls.find(([url]) => url.includes('/character-items')) ?? [];

  return JSON.parse(String(options?.body)).memberItemIds;
}

describe('CharacterCustomizeScreen', () => {
  test('모자 탭이 기본으로 열리고 보유한 모자와 현재 착용 상태가 보인다', async () => {
    const tree = await renderScreen();

    const texts = collectTexts(tree.root);
    expect(texts).toContain(HAT.name);
    expect(texts).toContain(OTHER_HAT.name);
    // 다른 카테고리 아이템은 탭을 옮기기 전까지 보이지 않는다.
    expect(texts).not.toContain(TOP.name);
    expect(
      findByAccessibilityLabel(tree.root, `${HAT.name} 벗기`).props
        .accessibilityState.selected,
    ).toBe(true);
  });

  test('아무것도 바꾸지 않으면 저장 버튼이 잠겨 있다', async () => {
    const tree = await renderScreen();

    expect(findButtonByText(tree.root, '저장하기').props.disabled).toBe(true);
  });

  test('같은 카테고리의 다른 아이템으로 갈아입고 저장하면 새 조합만 전송한다', async () => {
    const tree = await renderScreen();

    await press(tree.root, `${OTHER_HAT.name} 착용하기`);
    await pressButton(tree.root, '저장하기');

    expect(savedMemberItemIds()).toEqual([OTHER_HAT.memberItemId]);
  });

  test('모두 벗고 저장하면 빈 목록을 전송한다', async () => {
    const tree = await renderScreen();

    await press(tree.root, '아이템 모두 벗기');
    await pressButton(tree.root, '저장하기');

    expect(savedMemberItemIds()).toEqual([]);
  });

  test('탭을 옮기면 그 카테고리의 보유 아이템만 보인다', async () => {
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
    expect(texts).toContain(TOP.name);
    expect(texts).not.toContain(HAT.name);
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
});
