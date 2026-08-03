import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { MemberAvatar } from '../../../features/member/components/MemberAvatar';
import type {
  RoomMemberResponse,
  SentRoomInvite,
} from '../../../features/room/api/roomApi';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type RoomMemberListProps = {
  members: RoomMemberResponse[];
  myMemberId: number | null;
  /** 방장에게만 채워진다(팀원은 누가 초대됐는지 볼 필요가 없다).
      서버가 내가 보낸 초대만 내려줘 이 방의 PENDING 건으로 걸러져 있다. */
  pendingInvites: SentRoomInvite[];
  onCancelInvite: (invite: SentRoomInvite) => void;
  /** 취소 요청이 나가 있는 초대. 응답이 올 때까지 버튼을 잠근다. */
  cancelingRequestId: number | null;
};

const AVATAR_SIZE = 40;

/** 들어와 있는 친구와 아직 수락을 기다리는 초대를 한 카드에 모아 보여준다. */
export function RoomMemberList({
  members,
  myMemberId,
  pendingInvites,
  onCancelInvite,
  cancelingRequestId,
}: RoomMemberListProps) {
  return (
    <Card>
      <AppText style={styles.heading}>
        {`참여 중인 친구 ${members.length}`}
      </AppText>

      <View style={styles.list}>
        {members.map(member => (
          <View key={member.memberId} style={styles.row}>
            <MemberAvatar
              gender={member.gender}
              defaultImageUrl={member.defaultImageUrl}
              equippedItems={member.equippedItems}
              style={styles.avatar}
            />
            {/* 이름과 방장 배지는 붙여 두고, 미션 수만 오른쪽 끝에 고정한다.
                배지가 오른쪽으로 밀리면 줄마다 배치가 어긋나 보인다. */}
            <View style={styles.nameGroup}>
              <AppText
                style={[styles.name, styles.memberName]}
                numberOfLines={1}
              >
                {member.memberId === myMemberId ? '나' : member.nickname}
              </AppText>
              {member.host ? <Badge label="방장" variant="highlight" /> : null}
            </View>
            <AppText style={styles.missionCount}>
              {`미션 ${member.completedMissionCount}개`}
            </AppText>
          </View>
        ))}
      </View>

      {pendingInvites.length > 0 ? (
        <>
          <AppText style={[styles.heading, styles.pendingHeading]}>
            {`수락 대기 중 ${pendingInvites.length}`}
          </AppText>
          <View style={styles.list}>
            {pendingInvites.map(invite => {
              const isCanceling = cancelingRequestId === invite.requestId;

              return (
                <View key={invite.requestId} style={styles.row}>
                  <View style={[styles.avatar, styles.pendingAvatar]}>
                    <Ionicons
                      name="hourglass-outline"
                      size={18}
                      color={colors.mutedStrong}
                    />
                  </View>
                  <AppText
                    style={[styles.name, styles.pendingName]}
                    numberOfLines={1}
                  >
                    {invite.inviteeNickname}
                  </AppText>
                  <Pressable
                    onPress={() => onCancelInvite(invite)}
                    disabled={isCanceling}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${invite.inviteeNickname} 초대 취소`}
                    style={({ pressed }) => [
                      styles.cancelButton,
                      (pressed || isCanceling) && styles.cancelButtonPressed,
                    ]}
                  >
                    <AppText style={styles.cancelLabel}>
                      {isCanceling ? '취소 중...' : '초대 취소'}
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: bodyFont.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  pendingHeading: {
    marginTop: spacing.lg,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAvatar: {
    backgroundColor: colors.neutralBg,
  },
  nameGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  memberName: {
    flex: 0,
    flexShrink: 1,
  },
  pendingName: {
    opacity: 0.6,
  },
  missionCount: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.inkMuted,
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cancelButtonPressed: {
    opacity: 0.5,
  },
  cancelLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.danger,
  },
});
