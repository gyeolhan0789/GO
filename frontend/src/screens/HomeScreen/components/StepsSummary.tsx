import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { BottomSheet } from '../../../shared/components/BottomSheet/BottomSheet';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';
import { StepsProgressBar } from './StepsProgressBar';

type StepsSummaryProps = {
  steps: number;
};

type GoalTier = '5000' | '7000' | '10000';

// 산책방에서 정하는 주간 누적 목표(targetStepCount)와는 다른 축이라, 서버
// 값이 아니라 사용자가 고르는 하루 권장 걸음수다.
const GOAL_TIER_OPTIONS: {
  label: string;
  value: GoalTier;
  icon: ImageSourcePropType;
}[] = [
  {
    label: '입문자',
    value: '5000',
    icon: require('../assets/tier-beginner.png'),
  },
  { label: '일반', value: '7000', icon: require('../assets/tier-general.png') },
  {
    label: '도전',
    value: '10000',
    icon: require('../assets/tier-challenge.png'),
  },
];

const DEFAULT_GOAL_TIER: GoalTier = '7000';

function formatWithComma(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function StepsSummary({ steps }: StepsSummaryProps) {
  const [goalTier, setGoalTier] = useState<GoalTier>(DEFAULT_GOAL_TIER);
  const [isSheetVisible, setSheetVisible] = useState(false);
  const goalSteps = Number(goalTier);
  const percent = Math.round((steps / goalSteps) * 100);

  return (
    <View style={styles.container}>
      <AppText style={styles.label}>오늘 걸음</AppText>
      <View style={styles.valueRow}>
        <AppText style={styles.value}>{formatWithComma(steps)}</AppText>
        <AppText style={styles.unit}>보</AppText>
      </View>
      <View style={styles.progressBarWrapper}>
        <StepsProgressBar percent={percent} />
      </View>
      <Pressable
        style={styles.goalRow}
        onPress={() => setSheetVisible(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="하루 목표 걸음수 설정"
      >
        <AppText style={styles.goal}>
          목표 {formatWithComma(goalSteps)}보 · {percent}%
        </AppText>
        <Ionicons
          name="help-circle-outline"
          size={14}
          color={colors.successText}
        />
      </Pressable>

      <BottomSheet
        visible={isSheetVisible}
        onClose={() => setSheetVisible(false)}
        title="하루 목표 걸음수"
      >
        <AppText style={styles.sheetDescription}>
          산책방에서 정하는 주간 목표와는 별개로, 저희 서비스가 권장하는 하루
          걸음수예요. 원하는 난이도로 바꿔보세요.
        </AppText>
        {GOAL_TIER_OPTIONS.map(option => {
          const isSelected = option.value === goalTier;
          return (
            <Pressable
              key={option.value}
              style={[styles.tierRow, isSelected && styles.tierRowSelected]}
              onPress={() => setGoalTier(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.tierIcon}>
                <Image
                  source={option.icon}
                  style={styles.tierIconImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.tierTextGroup}>
                <AppText style={styles.tierTitle}>{option.label}</AppText>
                <AppText style={styles.tierSubtitle}>
                  {formatWithComma(Number(option.value))}보
                </AppText>
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected ? (
                  <Ionicons name="checkmark" size={14} color={colors.surface} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.6,
  },
  valueRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    lineHeight: lineHeights[30],
    color: colors.ink,
  },
  unit: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.ink,
    marginBottom: 3,
  },
  progressBarWrapper: {
    alignSelf: 'center',
    width: '80%',
  },
  goalRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  goal: {
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.successText,
  },
  sheetDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.7,
    marginBottom: spacing.md,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tierRowSelected: {
    borderColor: colors.ink,
  },
  tierIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  tierIconImage: {
    width: 50,
    height: 50,
  },
  tierTextGroup: {
    flex: 1,
  },
  tierTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.ink,
  },
  tierSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
});
