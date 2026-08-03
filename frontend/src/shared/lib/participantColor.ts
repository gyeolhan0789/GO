import { participantColors } from '../constants/colors';

/**
 * 공유 방(빙고판, 걸음 진행바)에서 인원별 식별 색을 정한다. 참가자 배열의
 * 순서를 그대로 인덱스로 쓰면 안 된다 — 방장이 몇 번째로 들어왔는지에 따라
 * "나"의 색이 화면마다 달라지기 때문이다. 항상 "나"를 participantColors[0]
 * (에메랄드)로 고정하고, 나머지 인원은 나를 뺀 목록에서의 순서로 1번부터
 * 배정한다.
 */
export function getParticipantColor(
  memberId: number,
  myMemberId: number | null,
  members: { memberId: number }[],
): string {
  if (memberId === myMemberId) {
    return participantColors[0];
  }
  const others = members.filter(member => member.memberId !== myMemberId);
  const index = others.findIndex(member => member.memberId === memberId);
  const otherColors = participantColors.slice(1);
  return otherColors[Math.max(0, index) % otherColors.length];
}
