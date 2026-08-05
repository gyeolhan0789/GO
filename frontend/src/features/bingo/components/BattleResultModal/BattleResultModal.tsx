import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
  BATTLE_LOSER_REWARD_POINT,
  BATTLE_WINNER_REWARD_POINT,
} from '../../model/battleOutcome';
import { AppText } from '../../../../shared/components/AppText/AppText';
import { controlHeight } from '../../../../shared/constants/sizing';
import { colors } from '../../../../shared/constants/colors';
import { radius } from '../../../../shared/constants/radius';
import { spacing } from '../../../../shared/constants/spacing';
import {
  fontFamily,
  lineHeights,
} from '../../../../shared/constants/typography';

/** 몰수로 끝난 대결의 내 입장. 정상 승부는 판 위 대결 현황 카드가 말해준다. */
export type BattleForfeitResult = 'WIN_BY_FORFEIT' | 'FORFEITED';

type BattleResultModalProps = {
  /** null이면 닫힌 상태다. */
  result: BattleForfeitResult | null;
  onConfirm: () => void;
};

const COPY: Record<
  BattleForfeitResult,
  {
    icon: 'trophy-outline' | 'flag-outline';
    title: string;
    subtitle: string;
    rewardPoint: number;
  }
> = {
  WIN_BY_FORFEIT: {
    icon: 'trophy-outline',
    title: '상대가 기권했어요',
    subtitle: '대결이 나의 승리로 끝났어요!',
    rewardPoint: BATTLE_WINNER_REWARD_POINT,
  },
  FORFEITED: {
    icon: 'flag-outline',
    title: '기권했어요',
    subtitle: '상대의 승리로 대결이 끝났어요',
    rewardPoint: BATTLE_LOSER_REWARD_POINT,
  },
};

/**
 * 몰수 종료(기권/몰수승)와 보상을 알리는 모달. 미션 성공 모달과 같은 조립
 * (스탬프 + 보상 배지 + 확인)을 써서 결과 화면의 톤을 하나로 유지한다.
 */
export function BattleResultModal({ result, onConfirm }: BattleResultModalProps) {
  const copy = result === null ? null : COPY[result];

  return (
    <Modal
      visible={copy !== null}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
    >
      {/* 결과는 판정이라 화면 중앙에 세운다 — 아래에서 올라오는 시트보다
          걸음을 멈추고 읽게 만든다. */}
      <View style={styles.backdrop}>
        {copy === null ? null : (
          <View style={styles.card}>
            <AppText style={styles.cardTitle}>대결 결과</AppText>
            <View style={styles.stampWrapper}>
              <View style={styles.stampShadow} />
              <View style={styles.stamp}>
                <Ionicons name={copy.icon} size={36} color={colors.ink} />
              </View>
            </View>

            <AppText style={styles.title}>{copy.title}</AppText>
            <AppText style={styles.subtitle}>{copy.subtitle}</AppText>

            <View style={styles.rewardBadge}>
              <View style={styles.rewardDot} />
              <AppText style={styles.rewardBadgeText}>
                +{copy.rewardPoint} 포인트 획득
              </AppText>
            </View>

            <Pressable
              style={styles.confirmButton}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="확인"
            >
              <AppText style={styles.confirmButtonText}>확인</AppText>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  cardTitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.inkMuted,
    marginBottom: spacing.lg,
  },
  // 미션 성공 모달과 같은 도장. 어긋난 잉크 그림자가 픽셀 톤을 만든다.
  stampWrapper: {
    width: 84,
    height: 84,
    marginBottom: spacing.lg,
  },
  stampShadow: {
    position: 'absolute',
    top: 6,
    left: 3,
    width: '100%',
    height: '100%',
    backgroundColor: colors.ink,
    transform: [{ rotate: '-8deg' }],
  },
  stamp: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.highlightBg,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '6deg' }],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: lineHeights[20],
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  rewardDot: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.highlightBg,
  },
  rewardBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  confirmButton: {
    height: controlHeight.lg,
    width: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.surface,
  },
});
