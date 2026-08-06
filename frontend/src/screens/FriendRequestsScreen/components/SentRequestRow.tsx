import { Pressable, StyleSheet, View } from 'react-native';

import type { SentFriendRequest } from '../../../features/friend/api/friendApi';
import { MemberAvatar } from '../../../features/member/components/MemberAvatar';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { controlHeight } from '../../../shared/constants/sizing';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type SentRequestRowProps = {
  request: SentFriendRequest;
  onCancel: () => void;
  disabled?: boolean;
};

const AVATAR_SIZE = 40;

/**
 * '2026-08-03T14:23:45.123' -> '2026.08.03'. 서버 LocalDateTime은 시간대가 없어
 * Date로 파싱하지 않고 문자열을 쪼갠다(features/history/model/format.ts와 같은 이유).
 */
function formatRequestedDate(createdAt: string): string {
  const [date = ''] = createdAt.split('T');
  return date.replace(/-/g, '.');
}

/** 내가 보낸 친구 요청 한 줄. 상대가 응답하기 전까지는 여기서 거둬들일 수 있다. */
export function SentRequestRow({
  request,
  onCancel,
  disabled = false,
}: SentRequestRowProps) {
  return (
    <Card style={styles.card} wrapperStyle={styles.wrapper}>
      <MemberAvatar
        gender={request.gender}
        defaultImageUrl={request.defaultImageUrl}
        equippedItems={request.equippedItems}
        style={styles.avatar}
      />
      <View style={styles.textGroup}>
        <AppText style={styles.nickname} numberOfLines={1}>
          {request.inviteeNickname}
        </AppText>
        <AppText style={styles.requestedAt} numberOfLines={1}>
          {formatRequestedDate(request.createdAt)} 요청
        </AppText>
      </View>
      <Pressable
        onPress={onCancel}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${request.inviteeNickname}님에게 보낸 친구 요청 취소`}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.cancelButton,
          pressed && styles.cancelButtonPressed,
          disabled && styles.cancelButtonDisabled,
        ]}
      >
        <AppText
          style={[
            styles.cancelButtonText,
            disabled && styles.cancelButtonTextDisabled,
          ]}
          numberOfLines={1}
        >
          {disabled ? '취소 중...' : '요청 취소'}
        </AppText>
      </Pressable>
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
  // 원 테두리 디자인은 CharacterBust가 모든 화면 공통으로 그린다.
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  nickname: {
    fontFamily: bodyFont.medium,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  requestedAt: {
    fontFamily: bodyFont.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.inkMuted,
  },
  cancelButton: {
    height: controlHeight.compact,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  cancelButtonPressed: {
    backgroundColor: colors.neutralBg,
  },
  cancelButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.neutralBg,
  },
  cancelButtonText: {
    fontFamily: bodyFont.medium,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
  },
  cancelButtonTextDisabled: {
    // neutralBg 위에서도 읽히는 회색(muted는 대비가 모자란다).
    color: colors.mutedStrong,
  },
});
