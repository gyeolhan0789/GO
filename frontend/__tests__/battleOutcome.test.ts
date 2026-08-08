/**
 * @format
 */

import type { BattleProgress } from '../src/features/bingo/api/bingoApi';
import {
  isForfeitEnd,
  remainingBingoLines,
  resolveBattleOutcome,
} from '../src/features/bingo/model/battleOutcome';

function buildProgress(overrides: Partial<BattleProgress> = {}): BattleProgress {
  return {
    roomStatus: 'ACTIVE',
    gameStatus: 'ACTIVE',
    me: {
      memberId: 1,
      bingoBoardId: 100,
      totalCellCount: 9,
      approvedCellCount: 3,
      completedBingoCount: 1,
      targetReached: false,
    },
    opponent: {
      memberId: 2,
      bingoBoardId: 200,
      totalCellCount: 9,
      approvedCellCount: 2,
      completedBingoCount: 0,
      targetReached: false,
    },
    result: null,
    ...overrides,
  };
}

describe('resolveBattleOutcome', () => {
  test('아무도 목표에 못 닿았으면 진행 중이다', () => {
    expect(resolveBattleOutcome(buildProgress())).toBe('IN_PROGRESS');
  });

  test('내가 목표에 닿으면 이긴 것이다', () => {
    const progress = buildProgress();
    progress.me.targetReached = true;

    expect(resolveBattleOutcome(progress)).toBe('WIN');
  });

  test('상대가 목표에 닿으면 진 것이다', () => {
    const progress = buildProgress();
    progress.opponent.targetReached = true;

    expect(resolveBattleOutcome(progress)).toBe('LOSE');
  });

  test('줄 수만 앞선다고 이긴 것으로 보지 않는다', () => {
    // 목표에 닿아야 끝난다. 앞서고 있는 것과 이긴 것은 다르다.
    const progress = buildProgress();
    progress.me.completedBingoCount = 5;

    expect(resolveBattleOutcome(progress)).toBe('IN_PROGRESS');
  });

  test('아무도 못 닿았는데 게임이 끝났으면 승패를 단정하지 않는다', () => {
    // 상대가 방을 나가 몰수패가 난 경우다. 서버가 result를 안 채워 줘서
    // 이 응답만으로는 누가 이겼는지 알 수 없다.
    expect(resolveBattleOutcome(buildProgress({ gameStatus: 'ENDED' }))).toBe(
      'ENDED',
    );
  });

  test('서버가 승패를 채워 주면 그 값을 따른다', () => {
    // 지금은 항상 null이지만, 채워지기 시작하면 추론보다 정확하다.
    const progress = buildProgress({ result: true, gameStatus: 'ENDED' });
    progress.opponent.targetReached = true;

    expect(resolveBattleOutcome(progress)).toBe('WIN');
  });
});

describe('isForfeitEnd', () => {
  test('아무도 목표에 닿지 않고 끝났으면 몰수다', () => {
    expect(isForfeitEnd(buildProgress({ gameStatus: 'ENDED' }))).toBe(true);
  });

  test('진행 중이면 몰수가 아니다', () => {
    expect(isForfeitEnd(buildProgress())).toBe(false);
  });

  test('누군가 목표에 닿아 끝난 것은 정상 승부다', () => {
    const progress = buildProgress({ gameStatus: 'ENDED' });
    progress.me.targetReached = true;

    expect(isForfeitEnd(progress)).toBe(false);
  });

  test('상대가 목표에 닿은 경우도 정상 승부다', () => {
    const progress = buildProgress({ gameStatus: 'ENDED' });
    progress.opponent.targetReached = true;

    expect(isForfeitEnd(progress)).toBe(false);
  });
});

describe('remainingBingoLines', () => {
  test('목표까지 남은 줄 수를 센다', () => {
    expect(remainingBingoLines({ completedBingoCount: 1 }, 3)).toBe(2);
  });

  test('목표를 넘겨도 음수로 내려가지 않는다', () => {
    expect(remainingBingoLines({ completedBingoCount: 5 }, 3)).toBe(0);
  });
});
