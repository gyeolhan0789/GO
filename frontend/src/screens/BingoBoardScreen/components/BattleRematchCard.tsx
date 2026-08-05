import { StyleSheet, View } from 'react-native';

import { AppText } from '../../../shared/components/AppText/AppText';
import { Button } from '../../../shared/components/Button/Button';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';

type BattleRematchCardProps = {
  /** 방장만 판을 만들 수 있다(서버 제약). 상대는 제안을 받는 쪽이다. */
  isHost: boolean;
  /** 방장: 제안을 보내고 응답을 기다리는 중. */
  isOffering: boolean;
  /** 상대: 방장의 제안이 도착했다. */
  hasIncomingOffer: boolean;
  /** 판을 만드는 요청이 나가는 중. */
  isStarting: boolean;
  onOffer: () => void;
  onAccept: () => void;
  onDecline: () => void;
};

/**
 * 끝난 대결에서 한 판 더 하자고 주고받는 카드.
 *
 * 방장이 제안 → 상대가 수락 → 그때 방장이 판을 만든다. 방장이 곧바로 만들면
 * 상대는 시작된 줄도 모르고 남겨진다 — 상대의 접속 여부를 알 방법이 없어서다.
 *
 * 같은 화면의 다른 카드들과 같은 규격(2px 잉크 테두리)을 쓴다.
 */
export function BattleRematchCard({
  isHost,
  isOffering,
  hasIncomingOffer,
  isStarting,
  onOffer,
  onAccept,
  onDecline,
}: BattleRematchCardProps) {
  return (
    <View style={styles.card}>
      {isStarting ? (
        <AppText style={styles.status}>새 판을 만들고 있어요...</AppText>
      ) : hasIncomingOffer ? (
        <>
          <AppText style={styles.title}>한 판 더 할까요?</AppText>
          <AppText style={styles.status}>
            상대가 재대결을 신청했어요
          </AppText>
          <View style={styles.buttonRow}>
            <Button
              label="좋아요"
              onPress={onAccept}
              accessibilityLabel="재대결 수락"
              style={styles.rowButton}
            />
            <Button
              label="그만하기"
              variant="secondary"
              onPress={onDecline}
              accessibilityLabel="재대결 거절"
              style={styles.rowButton}
            />
          </View>
        </>
      ) : isOffering ? (
        <>
          <AppText style={styles.title}>재대결을 신청했어요</AppText>
          {/* 상대가 앱을 껐는지 알 수 없다. 기다리라고만 하면 하염없이
              기다리게 되니, 나가도 된다는 걸 같이 말해준다. */}
          <AppText style={styles.status}>
            상대가 응답하면 바로 시작해요. 먼저 나가셔도 돼요.
          </AppText>
        </>
      ) : isHost ? (
        <>
          <AppText style={styles.title}>한 판 더 하기</AppText>
          <AppText style={styles.status}>
            같은 판 크기와 목표로 다시 시작해요
          </AppText>
          <Button
            label="재대결 신청"
            onPress={onOffer}
            accessibilityLabel="재대결 신청"
            style={styles.fullButton}
          />
        </>
      ) : (
        <AppText style={styles.status}>
          방장이 재대결을 신청하면 알려드려요
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  status: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.inkMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rowButton: {
    flex: 1,
  },
  fullButton: {
    marginTop: spacing.sm,
  },
});
