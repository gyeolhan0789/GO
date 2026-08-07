import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
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

/** 결과 화면에 한 줄로 서는 성과. key는 색을 고르는 데도 쓴다. */
type Achievement = {
  key: 'mission' | 'reward';
  title: string;
  detail: string;
};

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
    achievedMissionCount,
    earnedPoint,
  } = route.params;

  // 이번 산책에서 이룬 것들. 해당 없는 줄은 아예 그리지 않는다 — 0을 적으면
  // 못 받은 걸 받은 것처럼 읽힌다.
  //
  // '목표 걸음 달성' 줄은 넣지 않는다. earnedPoint는 걸음 목표와 무관한 보상
  // (미션·게임)까지 합친 값이라 달성 신호로 못 쓰고, 서버가 달성 여부를 따로
  // 내려주지 않아 프론트가 판정할 근거가 없다.
  const achievements: Achievement[] = [];
  if (achievedMissionCount > 0) {
    achievements.push({
      key: 'mission',
      title: `미션 ${achievedMissionCount}개 성공!`,
      detail: '이번 산책에서 깬 칸',
    });
  }
  if (earnedPoint > 0) {
    achievements.push({
      key: 'reward',
      title: '보상 획득!',
      detail: `+ ${formatPoints(earnedPoint)}`,
    });
  }

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
        </Card>
        {achievements.length > 0 ? (
          <View style={styles.achievements}>
            {achievements.map(achievement => (
              <View
                key={achievement.key}
                style={styles.achievementRow}
                accessibilityRole="text"
                accessibilityLabel={`${achievement.title} ${achievement.detail}`}
              >
                <View
                  style={[
                    styles.dot,
                    achievement.key === 'reward'
                      ? styles.rewardDot
                      : styles.goalDot,
                  ]}
                />
                <View style={styles.achievementText}>
                  <AppText style={styles.achievementTitle}>
                    {achievement.title}
                  </AppText>
                  <AppText style={styles.achievementDetail}>
                    {achievement.detail}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        ) : null}

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

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  achievements: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  goalDot: {
    backgroundColor: colors.primarySoft,
  },
  rewardDot: {
    backgroundColor: colors.highlightBg,
  },
  achievementText: {
    // 긴 제목이 점을 밀어내지 않게.
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  achievementTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
  },
  achievementDetail: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
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
    marginVertical: spacing.md,
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
