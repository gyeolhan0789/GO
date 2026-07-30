/**
 * @format
 */

import type { RankingItem } from '../src/features/ranking/api/rankingApi';
import { orderRanking, splitPodium } from '../src/screens/RankingScreen/model';

function item(rank: number): RankingItem {
  return {
    rank,
    memberId: rank * 10,
    nickname: `${rank}위`,
    weeklySteps: 1000 - rank,
  };
}

/** 걸음 수가 같으면 서버는 순위도 같게 준다(`rank() over`). */
function tied(nickname: string, rank = 1, weeklySteps = 0): RankingItem {
  return { rank, memberId: nickname.charCodeAt(0), nickname, weeklySteps };
}

describe('시상대 분리', () => {
  test('1등이 가운데 서도록 2 · 1 · 3 순으로 세운다', () => {
    const { places } = splitPodium([item(1), item(2), item(3), item(4)]);

    expect(places.map(place => place?.rank)).toEqual([2, 1, 3]);
  });

  test('4위부터는 목록으로 내려간다', () => {
    const { rest } = splitPodium([item(1), item(2), item(3), item(4), item(5)]);

    expect(rest.map(place => place.rank)).toEqual([4, 5]);
  });

  test('인원이 모자라도 세 칸을 유지한다', () => {
    // 칸 수가 줄면 남은 시상대가 옆으로 늘어나 카드를 꽉 채운다.
    const { places, rest } = splitPodium([item(1)]);

    expect(places.map(place => place?.rank ?? null)).toEqual([null, 1, null]);
    expect(rest).toEqual([]);
  });
});

describe('줄 세우기와 순위 매기기', () => {
  test('걸음 수가 모두 같으면 나를 1위로, 나머지는 이름순으로 번호를 매긴다', () => {
    const ordered = orderRanking(
      [tied('하늘'), tied('가온'), tied('덕맨'), tied('나래')],
      '덕맨',
    );

    expect(ordered.map(place => [place.nickname, place.rank])).toEqual([
      ['덕맨', 1],
      ['가온', 2],
      ['나래', 3],
      ['하늘', 4],
    ]);
  });

  test('공동 순위가 풀려 시상대 세 칸이 모두 채워진다', () => {
    const { places, rest } = splitPodium(
      orderRanking(
        [tied('하늘'), tied('가온'), tied('덕맨'), tied('나래')],
        '덕맨',
      ),
    );

    // 1등이 가운데. 2 · 1 · 3 순으로 선다.
    expect(places.map(place => place?.nickname)).toEqual([
      '가온',
      '덕맨',
      '나래',
    ]);
    expect(rest.map(place => place.nickname)).toEqual(['하늘']);
  });

  test('걸음 수가 다르면 순서도 순위도 서버가 준 그대로다', () => {
    const ordered = orderRanking([item(1), item(2), item(3)], '2위');

    expect(ordered.map(place => [place.nickname, place.rank])).toEqual([
      ['1위', 1],
      ['2위', 2],
      ['3위', 3],
    ]);
  });

  test('동점 구간 안에서만 다시 줄을 세운다', () => {
    // 위에 둘이 있고 공동 3위가 셋 — 서버는 셋 모두 rank 3으로 준다.
    const ordered = orderRanking(
      [
        tied('선두', 1, 900),
        tied('둘째', 2, 700),
        tied('하늘', 3, 500),
        tied('덕맨', 3, 500),
        tied('가온', 3, 500),
      ],
      '덕맨',
    );

    expect(ordered.map(place => [place.nickname, place.rank])).toEqual([
      ['선두', 1],
      ['둘째', 2],
      ['덕맨', 3],
      ['가온', 4],
      ['하늘', 5],
    ]);
  });

  test('내 닉네임을 모르면 동점 구간을 이름순으로만 세운다', () => {
    const ordered = orderRanking(
      [tied('하늘'), tied('가온'), tied('나래')],
      undefined,
    );

    expect(ordered.map(place => place.nickname)).toEqual([
      '가온',
      '나래',
      '하늘',
    ]);
  });

  test('원본 배열을 건드리지 않는다', () => {
    const items = [tied('하늘'), tied('가온')];

    orderRanking(items, '가온');

    expect(items.map(place => place.nickname)).toEqual(['하늘', '가온']);
    expect(items.every(place => place.rank === 1)).toBe(true);
  });
});
