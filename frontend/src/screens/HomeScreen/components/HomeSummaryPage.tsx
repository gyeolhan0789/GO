import type { ImageSourcePropType } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';
import { CharacterCard } from './CharacterCard';
import { StatsBoxes } from './StatsBoxes';
import { StepsSummary } from './StepsSummary';

type HomeSummaryPageProps = {
  steps: number;
  goalSteps: number;
  characterName: string;
  characterImageSource?: ImageSourcePropType;
  distanceKm: number;
  calories: number;
  rewardHint: string;
  isWalking?: boolean;
  walkElapsedLabel?: string;
  onPressWalkBadge?: () => void;
};

export function HomeSummaryPage({
  steps,
  goalSteps,
  characterName,
  characterImageSource,
  distanceKm,
  calories,
  rewardHint,
  isWalking,
  walkElapsedLabel,
  onPressWalkBadge,
}: HomeSummaryPageProps) {
  return (
    <View style={styles.page}>
      <StepsSummary steps={steps} goalSteps={goalSteps} />
      <CharacterCard
        style={styles.character}
        name={characterName}
        characterImageSource={characterImageSource}
        isWalking={isWalking}
        walkElapsedLabel={walkElapsedLabel}
        onPressWalkBadge={onPressWalkBadge}
      />
      <StatsBoxes distanceKm={distanceKm} calories={calories} />
      <AppText style={styles.rewardHint}>{rewardHint}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    gap: spacing.md,
  },
  character: {
    flex: 1,
  },
  rewardHint: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    opacity: 0.6,
  },
});
