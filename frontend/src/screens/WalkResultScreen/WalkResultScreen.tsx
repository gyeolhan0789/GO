import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
import { sprites } from '../../features/member/assets/sprites';
import { PixelSprite } from '../../features/member/components/PixelSprite';
import { GAME_MODE_LABEL } from '../../features/room/model/gameMode';
import { AppText } from '../../shared/components/AppText/AppText';
import { Button } from '../../shared/components/Button/Button';
import { Card } from '../../shared/components/Card/Card';
import { Screen } from '../../shared/components/Screen/Screen';
import { colors } from '../../shared/constants/colors';
import { radius } from '../../shared/constants/radius';
import { spacing } from '../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../shared/constants/typography';
import { formatPoints } from '../../shared/lib/formatPoints';

type WalkResultScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'WalkResult'
>;

function formatElapsed(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function WalkResultScreen({ route, navigation }: WalkResultScreenProps) {
  const {
    roomName,
    mode,
    steps,
    distanceKm,
    calories,
    elapsedSeconds,
    earnedPoint,
  } = route.params;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText style={styles.title}>산책 완료!</AppText>
          <AppText style={styles.subtitle}>
            {GAME_MODE_LABEL[mode]} · {roomName}
          </AppText>
        </View>

        <Card style={styles.card}>
          <View style={styles.heroRow}>
            <AppText style={styles.heroValue}>{steps.toLocaleString()}</AppText>
            <AppText style={styles.heroUnit}>보</AppText>
          </View>
          <AppText style={styles.heroLabel}>이번 산책 걸음</AppText>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <AppText style={styles.statValue}>
                {formatElapsed(elapsedSeconds)}
              </AppText>
              <AppText style={styles.statLabel}>시간</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText style={styles.statValue}>
                {distanceKm}
                <AppText style={styles.statUnit}> km</AppText>
              </AppText>
              <AppText style={styles.statLabel}>거리</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText style={styles.statValue}>
                {calories}
                <AppText style={styles.statUnit}> kcal</AppText>
              </AppText>
              <AppText style={styles.statLabel}>칼로리</AppText>
            </View>
          </View>

          {/* 걸음 목표를 채웠을 때만 나온다. 미션 인증 포인트는 인증하는 그
              자리에서 이미 알려줘서 여기 다시 세지 않는다. */}
          {earnedPoint > 0 ? (
            <View
              style={styles.rewardRow}
              accessibilityRole="text"
              accessibilityLabel={`걸음 목표 보상 ${formatPoints(
                earnedPoint,
              )} 획득`}
            >
              <PixelSprite sprite={sprites.coin} size={COIN_SIZE} />
              <AppText style={styles.rewardValue}>
                +{formatPoints(earnedPoint)}
              </AppText>
              <AppText style={styles.rewardLabel}>걸음 목표 달성</AppText>
            </View>
          ) : null}
        </Card>

        <Button
          label="확인"
          size="lg"
          onPress={() => navigation.navigate('Main')}
          style={styles.confirmButton}
        />
      </View>
    </Screen>
  );
}

const COIN_SIZE = 18;

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.successBg,
  },
  rewardValue: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.successText,
  },
  rewardLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.successText,
    opacity: 0.8,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: lineHeights[24],
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.6,
  },
  card: {
    alignItems: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  heroValue: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    lineHeight: lineHeights[30],
    color: colors.primary,
  },
  heroUnit: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.primary,
    marginBottom: 4,
  },
  heroLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    marginTop: spacing.xs,
  },
  divider: {
    alignSelf: 'stretch',
    borderTopWidth: 1,
    borderStyle: 'dotted',
    borderColor: colors.border,
    marginVertical: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.neutralBg,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: lineHeights[17],
    color: colors.ink,
  },
  statUnit: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
  confirmButton: {
    width: '100%',
  },
});
