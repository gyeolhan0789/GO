import type { BattleProgress } from '../api/bingoApi';

/**
 * 대결의 현재 판세.
 *
 * `ENDED`는 "끝났는데 이 응답만으로는 승패를 모른다"는 뜻이다. 상대가 방을
 * 나가 몰수패가 나면 아무도 목표에 닿지 않은 채 게임만 끝나는데, 서버가
 * battleProgress.result를 항상 null로 주기 때문에 여기서 가릴 수가 없다.
 */
export type BattleOutcome = 'IN_PROGRESS' | 'WIN' | 'LOSE' | 'ENDED';

export function resolveBattleOutcome(progress: BattleProgress): BattleOutcome {
  // 서버가 승패를 채워 주기 시작하면 그 값이 가장 정확하다.
  if (progress.result !== null) {
    return progress.result ? 'WIN' : 'LOSE';
  }

  // 목표에 닿는 순간 승부가 갈린다. 동시에 닿을 수는 없다 — 칸 승인이
  // 한 번에 하나씩 처리되고, 먼저 닿은 쪽에서 게임이 끝난다.
  if (progress.me.targetReached) {
    return 'WIN';
  }
  if (progress.opponent.targetReached) {
    return 'LOSE';
  }

  return progress.gameStatus === 'ENDED' ? 'ENDED' : 'IN_PROGRESS';
}

/** 목표까지 남은 줄 수. 이미 닿았으면 0이다. */
export function remainingBingoLines(
  progress: BattleParticipantLike,
  targetBingoCount: number,
): number {
  return Math.max(0, targetBingoCount - progress.completedBingoCount);
}

type BattleParticipantLike = { completedBingoCount: number };
