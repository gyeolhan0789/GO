import type { ImageSourcePropType } from 'react-native';
import { StyleSheet, View } from 'react-native';

import type { CharacterLayer } from '../../../features/member/model/character';
import { spacing } from '../../../shared/constants/spacing';
import { CharacterCard } from './CharacterCard';
import { StatsBoxes } from './StatsBoxes';
import { StepsSummary } from './StepsSummary';

type HomeSummaryPageProps = {
  steps: number;
  characterName: string;
  characterBaseImage: ImageSourcePropType | null;
  characterFallbackImage?: ImageSourcePropType | null;
  characterItems: CharacterLayer[];
  distanceKm: number;
  calories: number;
  isWalking?: boolean;
  walkElapsedLabel?: string;
  onPressWalkBadge?: () => void;
};

export function HomeSummaryPage({
  steps,
  characterName,
  characterBaseImage,
  characterFallbackImage,
  characterItems,
  distanceKm,
  calories,
  isWalking,
  walkElapsedLabel,
  onPressWalkBadge,
}: HomeSummaryPageProps) {
  return (
    <View style={styles.page}>
      <StepsSummary steps={steps} />
      <CharacterCard
        style={styles.character}
        name={characterName}
        baseImage={characterBaseImage}
        fallbackImage={characterFallbackImage}
        items={characterItems}
        isWalking={isWalking}
        walkElapsedLabel={walkElapsedLabel}
        onPressWalkBadge={onPressWalkBadge}
      />
      <StatsBoxes distanceKm={distanceKm} calories={calories} />
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
});
