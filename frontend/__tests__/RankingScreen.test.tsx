/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RankingScreen } from '../src/screens/RankingScreen/RankingScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

/** 내 줄은 응답의 myRank로 가린다. 목업도 4위를 나로 둔다. */
const MY_RANK = 4;

function rankingPage(
  content: {
    rank: number;
    memberId: number;
    nickname: string;
    weeklySteps: number;
  }[],
) {
  return {
    myRank: MY_RANK,
    myWeeklySteps: 58720,
    rankings: {
      content,
      totalElements: content.length,
      totalPages: 1,
      currentPage: 0,
      size: 20,
      hasNext: false,
    },
  };
}

const FRIEND_RANKING = rankingPage([
  { rank: 1, memberId: 1, nickname: '민준', weeklySteps: 71720 },
  { rank: 2, memberId: 2, nickname: '하늘', weeklySteps: 59720 },
  { rank: 3, memberId: 3, nickname: '태민', weeklySteps: 59520 },
  { rank: MY_RANK, memberId: 4, nickname: '덕맨', weeklySteps: 58720 },
  { rank: 5, memberId: 5, nickname: '유나', weeklySteps: 52310 },
]);

const REGION_RANKING = rankingPage([
  { rank: 1, memberId: 9, nickname: '서준', weeklySteps: 98120 },
]);

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes('/rankings/friends')) {
      return jsonResponse(200, FRIEND_RANKING);
    }
    if (url.includes('/rankings')) {
      return jsonResponse(200, { ...REGION_RANKING, region: 'SEOUL' });
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

async function renderScreen() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const client = queryClient;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <RankingScreen />
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

/** 라벨이 붙은 노드는 합성/호스트가 겹쳐 잡히므로 개수 대신 유무만 본다. */
function hasSkeleton(root: ReactTestInstance) {
  return (
    root.findAll(node => node.props.accessibilityLabel === '랭킹을 불러오는 중')
      .length > 0
  );
}

function rankingRequestCount() {
  return fetchMock.mock.calls.filter(([url]) => url.includes('/rankings'))
    .length;
}

async function selectScope(root: ReactTestInstance, label: string) {
  await act(async () => {
    root
      .find(
        node =>
          node.props.accessibilityRole === 'tab' &&
          node.props.children?.props?.children === label,
      )
      .props.onPress();
  });
  await flushQueries();
}

describe('RankingScreen', () => {
  test('친구 랭킹이 기본으로 열리고 상위 3명과 나머지가 함께 보인다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('랭킹');
    // 시상대(1~3위)
    expect(texts).toContain('민준');
    expect(texts).toContain('71,720');
    // 목록(4위 이하)
    expect(texts).toContain('유나');
    expect(texts).toContain('52,310');
  });

  test('내 줄은 닉네임 대신 "나"로 보인다', async () => {
    const tree = await renderScreen();

    // 4위가 로그인 회원이다. 시상대에 오르지 못했으므로 목록에 있다.
    expect(collectTexts(tree.root)).toContain('나');
    expect(collectTexts(tree.root)).not.toContain('덕맨');
  });

  test('지역 랭킹 탭으로 바꾸면 지역 랭킹을 부른다', async () => {
    const tree = await renderScreen();

    await selectScope(tree.root, '지역 랭킹');

    expect(collectTexts(tree.root)).toContain('서준');
    expect(
      fetchMock.mock.calls.some(
        ([url]) => url.includes('/rankings') && !url.includes('/friends'),
      ),
    ).toBe(true);
  });

  test('불러오는 동안 스켈레톤을 보여주고, 다 받으면 치운다', async () => {
    let resolveRanking: ((value: unknown) => void) | null = null;
    fetchMock.mockImplementation(async () => {
      return new Promise(resolve => {
        resolveRanking = resolve;
      }) as never;
    });

    const tree = await renderScreen();

    expect(hasSkeleton(tree.root)).toBe(true);

    await act(async () => {
      resolveRanking?.(jsonResponse(200, FRIEND_RANKING));
    });
    await flushQueries();

    expect(hasSkeleton(tree.root)).toBe(false);
    expect(collectTexts(tree.root)).toContain('민준');
  });

  test('당겨서 새로고침하면 랭킹을 다시 부른다', async () => {
    const tree = await renderScreen();
    const before = rankingRequestCount();

    await act(async () => {
      tree.root
        .findAll(node => node.props.refreshControl != null)[0]
        .props.refreshControl.props.onRefresh();
    });
    await flushQueries();

    expect(rankingRequestCount()).toBeGreaterThan(before);
  });

  test('기록이 없으면 빈 상태 문구를 보여준다', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(200, rankingPage([])),
    );

    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain(
      '아직 랭킹에 오른 친구가 없어요. 친구를 추가해 보세요.',
    );
  });
});
