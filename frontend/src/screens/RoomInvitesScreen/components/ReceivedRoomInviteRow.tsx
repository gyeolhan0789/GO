import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { ReceivedRoomInvite } from '../../../features/room/api/roomApi';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';

type ReceivedRoomInviteRowProps = {
  invite: ReceivedRoomInvite;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
};

export function ReceivedRoomInviteRow({
  invite,
  onAccept,
  onReject,
  disabled = false,
}: ReceivedRoomInviteRowProps) {
  return (
    <Card style={styles.card} wrapperStyle={styles.wrapper}>
      <View style={styles.icon}>
        <Ionicons name="walk" size={20} color={colors.highlightText} />
      </View>
      <Text style={styles.message}>
        {invite.inviterNickname}님이 산책방에 초대했습니다
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={onReject}
          disabled={disabled}
          style={[
            styles.actionButton,
            styles.rejectButton,
            disabled && styles.actionButtonDisabled,
          ]}
        >
          <Text style={styles.rejectButtonText}>거절</Text>
        </Pressable>
        <Pressable
          onPress={onAccept}
          disabled={disabled}
          style={[
            styles.actionButton,
            styles.acceptButton,
            disabled && styles.actionButtonDisabled,
          ]}
        >
          <Text style={styles.acceptButtonText}>수락</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // 카드 우측 오프셋 그림자(shadow.offset)가 리스트 폭 안에서 잘리지 않도록
    // 오른쪽에 그만큼 여백을 남긴다.
    alignSelf: 'stretch',
    marginRight: shadow.offset,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.highlightSoftBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'BMDOHYEON',
    fontSize: 14,
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  rejectButton: {
    backgroundColor: colors.surface,
  },
  rejectButtonText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    color: colors.ink,
  },
  acceptButton: {
    backgroundColor: colors.successBg,
  },
  acceptButtonText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    color: colors.successText,
  },
});
