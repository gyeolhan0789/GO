import { Pressable, StyleSheet, View } from 'react-native';

import type { ReceivedFriendRequest } from '../../../features/friend/api/friendApi';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import { lineHeights } from '../../../shared/constants/typography';

type ReceivedRequestRowProps = {
  request: ReceivedFriendRequest;
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
};

export function ReceivedRequestRow({
  request,
  onAccept,
  onReject,
  disabled = false,
}: ReceivedRequestRowProps) {
  return (
    <Card style={styles.card} wrapperStyle={styles.wrapper}>
      <View style={styles.avatar} />
      <AppText style={styles.nickname} numberOfLines={1}>
        {request.inviterNickname}
      </AppText>
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
          <AppText style={styles.rejectButtonText}>거절</AppText>
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
          <AppText style={styles.acceptButtonText}>수락</AppText>
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
  },
  nickname: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
    lineHeight: lineHeights[15],
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
    lineHeight: lineHeights[12],
    color: colors.ink,
  },
  acceptButton: {
    backgroundColor: colors.successBg,
  },
  acceptButtonText: {
    fontFamily: 'BMDOHYEON',
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.successText,
  },
});
