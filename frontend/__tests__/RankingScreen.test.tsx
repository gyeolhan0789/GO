/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { colors } from '../src/shared/constants/colors';

import { RankingScreen } from '../src/screens/RankingScreen/RankingScreen';
import { MyRankBar } from '../src/screens/RankingScreen/components/MyRankBar';
import { RankingAvatar } from '../src/screens/RankingScreen/components/RankingAvatar';
import { RankingRow } from '../src/screens/RankingScreen/components/RankingRow';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

/** 내 줄은 닉네임으로 가린다. 4위를 나로 둔다. */
const MY_NICKNAME = '덕맨';
const MY_RANK = 4;

const MY_CHARACTER = {
  memberId: 4,
  nickname: MY_NICKNAME,
  defaultImageUrl: null,
  equippedItems: [],
};

function rankingPage(
  content: {
    rank: number;
    memberId: number;
    nickname: string;
    weeklySteps: number;
  }[],
  myRank = MY_RANK,
) {
  return {
    myRank,
    myWeeklySteps: 58720,
    rankings: {
      // 아바타는 착용 아이템으로 그린다. 조합 자체는 여기서 볼 게 아니라 비워둔다.
      content: content.map(item => ({ ...item, equippedItems: [] })),
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
  { rank: MY_RANK, memberId: 4, nickname: MY_NICKNAME, weeklySteps: 58720 },
  { rank: 5, memberId: 5, nickname: '유나', weeklySteps: 52310 },
]);

/** 아무도 걷지 않은 초기 상태. 서버는 동점자에게 같은 순위를 준다. */
const TIED_RANKING = rankingPage([
  { rank: 1, memberId: 1, nickname: '민준', weeklySteps: 0 },
  { rank: 1, memberId: 2, nickname: '하늘', weeklySteps: 0 },
  { rank: 1, memberId: 4, nickname: MY_NICKNAME, weeklySteps: 0 },
  { rank: 1, memberId: 5, nickname: '유나', weeklySteps: 0 },
]);

/** 내가 없는 지역 목록. 내 순위는 20위권 밖(37위)에 있다. */
const MY_RANK_OUTSIDE = 37;

/** 지역은 인원이 많다. 시상대 3명 뒤로도 이어지고 10위권 밖까지 내려간다. */
const REGION_RANKING = rankingPage(
  [
    { rank: 1, memberId: 9, nickname: '서준', weeklySteps: 98120 },
    { rank: 2, memberId: 10, nickname: '지우', weeklySteps: 81200 },
    { rank: 3, memberId: 11, nickname: '예린', weeklySteps: 77010 },
    { rank: 4, memberId: 12, nickname: '현우', weeklySteps: 60300 },
    { rank: 5, memberId: 13, nickname: '수아', weeklySteps: 44120 },
    { rank: 6, memberId: 14, nickname: '준서', weeklySteps: 42000 },
    { rank: 7, memberId: 15, nickname: '하윤', weeklySteps: 38000 },
    { rank: 8, memberId: 16, nickname: '은우', weeklySteps: 33000 },
    { rank: 9, memberId: 17, nickname: '채원', weeklySteps: 27000 },
    { rank: 10, memberId: 18, nickname: '시윤', weeklySteps: 21000 },
    { rank: 11, memberId: 19, nickname: '아린', weeklySteps: 18000 },
    { rank: 12, memberId: 20, nickname: '태오', weeklySteps: 12000 },
  ],
  MY_RANK_OUTSIDE,
);

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
    if (url.includes('/members/character')) {
      return jsonResponse(200, MY_CHARACTER as never);
    }
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

/** ScrollView에 스크롤 이벤트를 흘려보낸다. y가 커야 끝에 닿은 것으로 읽힌다. */
async function scrollTo(root: ReactTestInstance, y: number, height = 2000) {
  await act(async () => {
    root.findByType(ScrollView).props.onScroll({
      nativeEvent: {
        contentOffset: { x: 0, y },
        contentSize: { width: 400, height },
        layoutMeasurement: { width: 400, height: 800 },
      },
    });
  });
  await flushQueries();
}

/**
 * 목록 카드와 10위권 밖 첫 줄의 위치를 실측했다고 알린다. 둘을 더한 값이 맨 위로
 * 버튼의 기준선이다.
 */
async function reportCutoffLayout(
  root: ReactTestInstance,
  cardTop: number,
  rowTop: number,
) {
  // 호스트 엘리먼트만 본다. View는 합성/호스트가 같은 props로 두 번 잡힌다.
  const withLayout = root.findAll(
    node => node.props.onLayout != null && typeof node.type === 'string',
  );

  await act(async () => {
    // 카드 래퍼가 경계 줄 래퍼보다 먼저 나온다(바깥이 먼저).
    withLayout[0].props.onLayout({ nativeEvent: { layout: { y: cardTop } } });
    withLayout[1].props.onLayout({ nativeEvent: { layout: { y: rowTop } } });
  });
  await flushQueries();
}

function hasScrollTopButton(root: ReactTestInstance) {
  return (
    root.findAll(node => node.props.accessibilityLabel === '맨 위로').length > 0
  );
}

/**
 * 맨 위로 버튼과 내 순위 줄을 담은 컬럼에서 둘의 순서를 읽는다. 버튼이 먼저
 * 오면 화면에서 줄 위에 놓인다.
 */
function floatingOrder(root: ReactTestInstance) {
  const column = root.find(node => {
    const style = StyleSheet.flatten(node.props.style) as {
      position?: string;
      gap?: number;
    };
    return style?.position === 'absolute' && style?.gap != null;
  });

  const labels = column
    .findAll(node => node.props.accessibilityLabel != null)
    .map(node => node.props.accessibilityLabel as string);

  // 합성 컴포넌트와 그 호스트 View가 같은 라벨로 두 번 잡힌다.
  return labels.filter((label, index) => label !== labels[index - 1]);
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

  test('지역 랭킹도 4위부터 목록으로 이어진다', async () => {
    fetchMock.mockImplementation(async url => {
      if (url.includes('/members/character')) {
        return jsonResponse(200, MY_CHARACTER as never);
      }
      if (url.includes('/rankings/friends')) {
        return jsonResponse(200, FRIEND_RANKING);
      }
      return jsonResponse(200, { ...REGION_RANKING, region: 'SEOUL' });
    });

    const tree = await renderScreen();
    await selectScope(tree.root, '지역 랭킹');

    const texts = collectTexts(tree.root);
    // 시상대 3명
    expect(texts).toContain('서준');
    expect(texts).toContain('지우');
    expect(texts).toContain('예린');
    // 4위부터는 목록
    expect(texts).toContain('현우');
    expect(texts).toContain('수아');
    expect(texts).toContain('준서');
  });

  test('불러오는 동안 스켈레톤을 보여주고, 다 받으면 치운다', async () => {
    let resolveRanking: ((value: unknown) => void) | null = null;
    fetchMock.mockImplementation(async url => {
      // 회원 조회는 스켈레톤과 무관하다. 랭킹 응답만 붙잡아 둔다.
      if (url.includes('/members/character')) {
        return jsonResponse(200, MY_CHARACTER as never);
      }
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

  test('목록에 있는 내 줄은 색으로 구분한다', async () => {
    const tree = await renderScreen();

    const myRow = tree.root
      .findAllByType(RankingRow)
      .find(row => row.props.isMe);
    expect(myRow).toBeDefined();

    // 다른 줄과 글자색이 달라야 한다.
    const colorOf = (row: ReactTestInstance) =>
      row
        .findAllByType(Text)
        .flatMap(node => StyleSheet.flatten(node.props.style) ?? [])
        .map(style => (style as { color?: string }).color);
    const otherRow = tree.root
      .findAllByType(RankingRow)
      .find(row => !row.props.isMe);

    expect(colorOf(myRow!)).toContain(colors.successText);
    expect(colorOf(otherRow!)).not.toContain(colors.successText);
  });

  test('순위권 밖이면 myRank·myWeeklySteps로 내 순위를 따로 띄운다', async () => {
    const tree = await renderScreen();
    await selectScope(tree.root, '지역 랭킹');

    const bar = tree.root.findAllByType(MyRankBar);
    expect(bar).toHaveLength(1);
    expect(bar[0].props.rank).toBe(MY_RANK_OUTSIDE);
    expect(bar[0].props.weeklySteps).toBe(58720);

    const texts = collectTexts(tree.root);
    expect(texts).toContain('나');
    expect(texts).toContain('58,720');
  });

  test('아바타는 서버가 준 착용 아이템으로 그린다', async () => {
    const hat = {
      memberItemId: 7,
      itemId: 70,
      name: '밀짚모자',
      category: 'HAT',
      imageUrl: '/items/straw.png',
    };

    fetchMock.mockImplementation(async url => {
      if (url.includes('/members/character')) {
        return jsonResponse(200, MY_CHARACTER as never);
      }
      const page = rankingPage([
        { rank: 1, memberId: 1, nickname: '민준', weeklySteps: 71720 },
        { rank: 2, memberId: 2, nickname: '하늘', weeklySteps: 59720 },
        { rank: 3, memberId: 3, nickname: '태민', weeklySteps: 59520 },
        { rank: 4, memberId: 5, nickname: '유나', weeklySteps: 52310 },
      ]);
      page.rankings.content[3].equippedItems = [hat] as never;
      return jsonResponse(200, page);
    });

    const tree = await renderScreen();

    const avatars = tree.root.findAllByType(RankingAvatar);
    const withHat = avatars.find(
      avatar => avatar.props.equippedItems?.length > 0,
    );

    expect(withHat).toBeDefined();
    expect(withHat!.props.equippedItems).toEqual([hat]);
  });

  test('참여 인원은 totalElements로 보여준다', async () => {
    const tree = await renderScreen();

    const header = tree.root
      .findAllByType(Text)
      .map(node =>
        (Array.isArray(node.props.children)
          ? node.props.children
          : [node.props.children]
        ).join(''),
      )
      .find(text => text.includes('참여중'));

    expect(header).toBe('총 5명 참여중');
  });

  test('순위가 안 잡히면 고정 줄에 숫자 대신 -를 둔다', async () => {
    fetchMock.mockImplementation(async url => {
      if (url.includes('/members/character')) {
        return jsonResponse(200, MY_CHARACTER as never);
      }
      return jsonResponse(
        200,
        rankingPage(
          [{ rank: 1, memberId: 9, nickname: '서준', weeklySteps: 98120 }],
          0,
        ),
      );
    });

    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain('-');
  });

  test('20위까지만 요청하고 페이지를 더 부르지 않는다', async () => {
    const tree = await renderScreen();
    await scrollTo(tree.root, 5000);

    const rankingCalls = fetchMock.mock.calls
      .map(([url]) => url)
      .filter(url => url.includes('/rankings'));

    expect(rankingCalls).toHaveLength(1);
    expect(rankingCalls[0]).toContain('size=20');
    expect(rankingCalls[0]).not.toContain('page=1');
  });

  test('10위권 밖이 보이기 시작하면 맨 위로 버튼이 뜬다', async () => {
    const tree = await renderScreen();
    await selectScope(tree.root, '지역 랭킹');
    // 목록 카드가 400, 그 안에서 11위 줄이 300 → 콘텐츠 기준 700.
    await reportCutoffLayout(tree.root, 400, 300);

    // 화면 아래 끝이 아직 700에 못 미친다(0 + 800 > 700 이면 안 되므로 음수 보정).
    await scrollTo(tree.root, -200);
    expect(hasScrollTopButton(tree.root)).toBe(false);

    // 기준선을 넘어섰다 = 11위 줄이 보이기 시작.
    await scrollTo(tree.root, 200);
    expect(hasScrollTopButton(tree.root)).toBe(true);
  });

  test('10위권 밖이 없으면 맨 위로 버튼을 띄우지 않는다', async () => {
    // 친구 탭은 5명뿐이라 경계 줄이 없다.
    const tree = await renderScreen();

    await scrollTo(tree.root, 5000);

    expect(hasScrollTopButton(tree.root)).toBe(false);
  });

  test('맨 위로 버튼은 내 순위 고정 줄 위에 쌓인다', async () => {
    const tree = await renderScreen();
    // 지역 탭은 내가 37위라 고정 줄이 뜬다.
    await selectScope(tree.root, '지역 랭킹');
    await reportCutoffLayout(tree.root, 400, 300);
    await scrollTo(tree.root, 200);

    expect(tree.root.findAllByType(MyRankBar)).toHaveLength(1);
    // 같은 컬럼 안에서 버튼이 줄보다 앞 = 화면에서 줄 위.
    const order = floatingOrder(tree.root);
    expect(order[0]).toBe('맨 위로');
    expect(order[1]).toContain('내 순위');
  });

  test('20위권 안이면 고정 줄을 띄우지 않는다', async () => {
    // 친구 탭의 내 순위는 4위 — 목록에 이미 있다.
    const tree = await renderScreen();

    expect(MY_RANK).toBeLessThanOrEqual(20);
    expect(tree.root.findAllByType(MyRankBar)).toHaveLength(0);
  });

  test('20위권 경계 바로 밖이면 고정 줄을 띄운다', async () => {
    fetchMock.mockImplementation(async url => {
      if (url.includes('/members/character')) {
        return jsonResponse(200, MY_CHARACTER as never);
      }
      return jsonResponse(
        200,
        rankingPage(
          [{ rank: 1, memberId: 9, nickname: '서준', weeklySteps: 98120 }],
          21,
        ),
      );
    });

    const tree = await renderScreen();

    expect(tree.root.findAllByType(MyRankBar)).toHaveLength(1);
    expect(tree.root.findByType(MyRankBar).props.rank).toBe(21);
  });

  test('탭을 바꾸면 맨 위로 버튼이 사라진다', async () => {
    const tree = await renderScreen();

    await selectScope(tree.root, '지역 랭킹');
    await reportCutoffLayout(tree.root, 400, 300);
    await scrollTo(tree.root, 200);
    expect(hasScrollTopButton(tree.root)).toBe(true);

    await selectScope(tree.root, '친구 랭킹');

    expect(hasScrollTopButton(tree.root)).toBe(false);
  });

  test('기록이 없으면 빈 상태 문구를 보여준다', async () => {
    fetchMock.mockImplementation(async url => {
      if (url.includes('/members/character')) {
        return jsonResponse(200, MY_CHARACTER as never);
      }
      return jsonResponse(200, rankingPage([]));
    });

    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain(
      '아직 랭킹에 오른 친구가 없어요. 친구를 추가해 보세요.',
    );
  });

  test('걸음 수가 모두 같아도 시상대가 채워지고 내가 1등 칸에 선다', async () => {
    fetchMock.mockImplementation(async url => {
      if (url.includes('/members/character')) {
        return jsonResponse(200, MY_CHARACTER as never);
      }
      return jsonResponse(200, TIED_RANKING);
    });

    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    // 내가 1위 → 시상대 가운데. 닉네임 대신 '나'로 보인다.
    expect(texts).toContain('나');
    expect(texts).not.toContain(MY_NICKNAME);
    // 나머지는 이름순 2 · 3위(민준 · 유나)가 시상대, 4위(하늘)는 목록으로.
    expect(texts).toContain('민준');
    expect(texts).toContain('유나');
    expect(texts).toContain('하늘');
  });
});
