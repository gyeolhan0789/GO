import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { BattleProgress } from '../../../features/bingo/api/bingoApi';
import { resolveBattleOutcome } from '../../../features/bingo/model/battleOutcome';
import { MemberAvatar } from '../../../features/member/components/MemberAvatar';
import type { RoomMemberResponse } from '../../../features/room/api/roomApi';
import {
  toOnlineMemberIds,
  type RoomPresenceMember,
} from '../../../features/room/hooks/useRoomPresenceSubscription';
import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type BattleProgressCardProps = {
  progress: BattleProgress;
  /** 방의 목표 줄 수. 먼저 닿는 쪽이 이긴다. */
  targetBingoCount: number | null;
  opponentNickname: string;
  /** 아바타를 그리는 데 필요한 방 멤버들. 없으면 기본 흉상이 나온다. */
  members: RoomMemberResponse[];
  myMemberId: number | null;
  /** 지금 방에 접속해 있는 멤버. null이면 아직 모른다(구독 전). */
  onlineMembers: RoomPresenceMember[] | null;
};

const OUTCOME_MESSAGE: Record<string, string> = {
  WIN: '이겼어요!',
  LOSE: '아깝게 졌어요',
  // 아무도 목표에 닿지 않았는데 끝났다 = 상대가 방을 나갔다(몰수). 서버가
  // 승패를 안 내려줘서 단정하지 않는다.
  ENDED: '대결이 끝났어요. 결과는 기록에서 확인할 수 있어요.',
};

/**
 * 대결은 사람마다 판이 따로라 내 판만 봐서는 이기고 있는지 알 수 없다.
 * 두 사람의 줄 수를 나란히 놓아 판세를 한 눈에 보여준다.
 */
export function BattleProgressCard({
  progress,
  targetBingoCount,
  opponentNickname,
  members,
  myMemberId,
  onlineMembers,
}: BattleProgressCardProps) {
  const outcome = resolveBattleOutcome(progress);
  const message = OUTCOME_MESSAGE[outcome];
  const onlineMemberIds = toOnlineMemberIds(onlineMembers);
  const findMember = (memberId: number) =>
    members.find(member => member.memberId === memberId) ?? null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <AppText style={styles.label}>대결 현황</AppText>
        {targetBingoCount !== null ? (
          <AppText style={styles.target}>{`목표 ${targetBingoCount}줄`}</AppText>
        ) : null}
      </View>

      <View style={styles.versusRow}>
        <Side
          name="나"
          member={myMemberId === null ? null : findMember(myMemberId)}
          lines={progress.me.completedBingoCount}
          approved={progress.me.approvedCellCount}
          total={progress.me.totalCellCount}
          leading={
            progress.me.completedBingoCount >
            progress.opponent.completedBingoCount
          }
          onlineMemberIds={onlineMemberIds}
        />
        <AppText style={styles.versus}>VS</AppText>
        <Side
          name={opponentNickname}
          member={findMember(progress.opponent.memberId)}
          lines={progress.opponent.completedBingoCount}
          approved={progress.opponent.approvedCellCount}
          total={progress.opponent.totalCellCount}
          leading={
            progress.opponent.completedBingoCount >
            progress.me.completedBingoCount
          }
          onlineMemberIds={onlineMemberIds}
        />
      </View>

      {message !== undefined ? (
        <AppText style={styles.outcome}>{message}</AppText>
      ) : null}
    </View>
  );
}

type SideProps = {
  name: string;
  member: RoomMemberResponse | null;
  lines: number;
  approved: number;
  total: number;
  leading: boolean;
  onlineMemberIds: Set<number> | null;
};

function Side({
  name,
  member,
  lines,
  approved,
  total,
  leading,
  onlineMemberIds,
}: SideProps) {
  const isOnline =
    member !== null && (onlineMemberIds?.has(member.memberId) ?? false);

  return (
    <View
      style={styles.side}
      // 접속을 테두리 색으로만 알리면 색을 구분하기 어려운 사용자에게는 정보가
      // 아니다. 이쪽에 말로도 남긴다.
      accessibilityLabel={`${name} ${isOnline ? '접속 중' : '오프라인'}`}
    >
      <View style={styles.avatarWrap}>
        {member ? (
          <MemberAvatar
            gender={member.gender}
            defaultImageUrl={member.defaultImageUrl}
            equippedItems={member.equippedItems}
            // CharacterBust의 기본 회색 링을 덮어쓴다(호출부 style이 뒤에 온다).
            style={[styles.avatar, isOnline && styles.avatarOnline]}
          />
        ) : (
          <Ionicons name="person" size={20} color={colors.muted} />
        )}
      </View>
      <AppText style={styles.sideName} numberOfLines={1}>
        {name}
      </AppText>
      <AppText style={[styles.sideLines, leading && styles.sideLeading]}>
        {`${lines}줄`}
      </AppText>
      <AppText style={styles.sideCells}>{`${approved}/${total} 칸`}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  // 같은 화면의 "빙고 진행 상황" 카드와 같은 규격 — 2px 잉크 테두리에 흰 면.
  card: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  target: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  versusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 2,
  },
  // 대기방의 VS 슬롯과 같은 조립을 작게 줄인 것.
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  // 접속 중. 크림 배경에 초록 1px은 잘 안 읽혀 두께도 함께 올린다
  // (대기방·멤버 목록과 같은 표시).
  avatarOnline: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  sideName: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  sideLines: {
    fontFamily: bodyFont.bold,
    fontSize: 24,
    lineHeight: lineHeights[24],
    color: colors.ink,
  },
  sideLeading: {
    color: colors.primary,
  },
  sideCells: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  versus: {
    fontFamily: bodyFont.bold,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.4,
    paddingHorizontal: spacing.sm,
  },
  outcome: {
    fontFamily: bodyFont.bold,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.primaryDark,
    textAlign: 'center',
  },
});
