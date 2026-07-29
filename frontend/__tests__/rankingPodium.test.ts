/**
 * @format
 */

import type { RankingItem } from '../src/features/ranking/api/rankingApi';
import { splitPodium } from '../src/screens/RankingScreen/model';

function item(rank: number): RankingItem {
  return {
    rank,
    memberId: rank * 10,
    nickname: `${rank}위`,
    weeklySteps: 1000 - rank,
  };
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
