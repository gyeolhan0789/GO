import type { RankingItem } from '../../features/ranking/api/rankingApi';

export const PODIUM_SIZE = 3;

/** 내 줄은 닉네임 대신 이걸 보여준다. 시상대와 목록이 같은 말을 써야 한다. */
export const ME_LABEL = '나';

/**
 * 시상대 세 칸을 정렬된 목록의 몇 번째로 채울지. 1등이 가운데에 서야 한다.
 *
 * 순위 값이 아니라 순서로 고르는 이유: 서버는 동점자에게 같은 순위를 준다
 * (`rank() over (order by weekly_steps desc)`). 그래서 걸음 수가 모두 같으면
 * 전원이 1위이고, 순위 값으로 자리를 찾으면 2·3위 칸이 영원히 빈다.
 */
const PODIUM_DISPLAY_ORDER = [1, 0, 2];

export type Podium = {
  /**
   * 왼쪽부터 그릴 자리(2위 · 1위 · 3위). 인원이 모자라도 항상 세 칸이며 빈 자리는
   * `null`이다. 칸 수가 줄면 남은 시상대가 옆으로 늘어나 모양이 깨진다.
   */
  places: (RankingItem | null)[];
  /** 시상대에 오르지 못한 4위 이하. */
  rest: RankingItem[];
};

/** 걸음 수가 같을 때 누가 앞에 서는지. 내가 맨 앞이고 나머지는 이름순이다. */
function compareTied(
  left: RankingItem,
  right: RankingItem,
  myNickname: string | undefined,
): number {
  if (left.nickname === myNickname) {
    return -1;
  }
  if (right.nickname === myNickname) {
    return 1;
  }
  return left.nickname.localeCompare(right.nickname, 'ko');
}

/**
 * 화면에 세울 순서로 줄을 다시 세우고 순위 번호를 매긴다.
 *
 * 서버는 걸음 수만 보고 순위를 매기므로 동점자가 모두 같은 순위를 받는다. 아무도
 * 걷지 않은 초기 상태에서는 전원이 공동 1위여서 시상대에 등수를 세울 수 없다.
 * 그래서 동점 구간만 다시 줄을 세우고(`compareTied`) 번호를 하나씩 늘려 붙인다.
 *
 * 걸음 수가 다른 사람의 앞뒤는 바꾸지 않는다. 순위는 어디까지나 걸음 수 순이다.
 */
export function orderRanking(
  items: RankingItem[],
  myNickname: string | undefined,
): RankingItem[] {
  const sorted = [...items].sort(
    (left, right) =>
      right.weeklySteps - left.weeklySteps ||
      compareTied(left, right, myNickname),
  );

  // `rank()`가 준 값은 동점 구간의 첫 자리다. 구간 안에서 하나씩 늘리면 된다.
  let tiedSteps: number | null = null;
  let offsetInTie = 0;

  return sorted.map(item => {
    if (item.weeklySteps === tiedSteps) {
      offsetInTie += 1;
    } else {
      tiedSteps = item.weeklySteps;
      offsetInTie = 0;
    }

    return offsetInTie === 0 ? item : { ...item, rank: item.rank + offsetInTie };
  });
}

/** 상위 3명은 시상대로, 나머지는 목록으로 가른다. `orderRanking` 결과를 받는다. */
export function splitPodium(items: RankingItem[]): Podium {
  const top = items.slice(0, PODIUM_SIZE);

  return {
    places: PODIUM_DISPLAY_ORDER.map(index => top[index] ?? null),
    rest: items.slice(PODIUM_SIZE),
  };
}
