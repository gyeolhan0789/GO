import type { RankingItem } from '../../features/ranking/api/rankingApi';

export const PODIUM_SIZE = 3;

/** 시상대에 세우는 좌우 순서. 1등이 가운데에 서야 한다. */
const PODIUM_DISPLAY_ORDER = [2, 1, 3];

export type Podium = {
  /**
   * 왼쪽부터 그릴 자리(2위 · 1위 · 3위). 인원이 모자라도 항상 세 칸이며 빈 자리는
   * `null`이다. 칸 수가 줄면 남은 시상대가 옆으로 늘어나 모양이 깨진다.
   */
  places: (RankingItem | null)[];
  /** 시상대에 오르지 못한 4위 이하. */
  rest: RankingItem[];
};

/**
 * 상위 3명은 시상대로, 나머지는 목록으로 가른다.
 *
 * 순위 자체는 서버가 매기므로 여기서 다시 정렬하지 않는다.
 */
export function splitPodium(items: RankingItem[]): Podium {
  const byRank = new Map(items.map(item => [item.rank, item]));

  return {
    places: PODIUM_DISPLAY_ORDER.map(rank => byRank.get(rank) ?? null),
    rest: items.filter(item => item.rank > PODIUM_SIZE),
  };
}
