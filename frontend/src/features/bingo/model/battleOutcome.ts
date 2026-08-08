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

/**
 * 대결 보상. 서버 PointRewardPolicy의 BATTLE_WINNER/LOSER_GAME_GOAL을 거울로
 * 뜬 값이다 — 종료 응답에 보상이 실려 오지 않아 화면이 직접 말해줘야 한다.
 * 서버 정책이 바뀌면 여기도 같이 바꿔야 한다.
 */
export const BATTLE_WINNER_REWARD_POINT = 300;
export const BATTLE_LOSER_REWARD_POINT = 50;

/**
 * 상대의 기권(몰수)으로 끝났는가.
 *
 * 서버는 기권 때 소켓 이벤트를 쏘지 않아서 밀려오는 신호가 없다. 대신 종료
 * 조건이 딱 두 가지(목표 달성/몰수)뿐이라는 걸 이용한다 — 목표 달성이었다면
 * targetReached가 진행률 이벤트로 먼저 도착했을 테니, **아무도 목표에 닿지
 * 않은 채 게임이 끝났다면 남은 설명은 몰수뿐이고, 내가 남아 있으니 승자는
 * 나다.**
 */
export function isForfeitEnd(progress: BattleProgress): boolean {
  return (
    progress.gameStatus === 'ENDED' &&
    !progress.me.targetReached &&
    !progress.opponent.targetReached
  );
}

/** 목표까지 남은 줄 수. 이미 닿았으면 0이다. */
export function remainingBingoLines(
  progress: BattleParticipantLike,
  targetBingoCount: number,
): number {
  return Math.max(0, targetBingoCount - progress.completedBingoCount);
}

type BattleParticipantLike = { completedBingoCount: number };
