import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type StatsBoxesProps = {
  distanceKm: number;
  calories: number;
};

export function StatsBoxes({ distanceKm, calories }: StatsBoxesProps) {
  return (
    <View style={styles.row}>
      <Card wrapperStyle={styles.boxWrapper} style={styles.box}>
        <Ionicons name="flash" size={13} color={colors.successText} />
        <Text style={styles.value}>{distanceKm}</Text>
        <Text style={styles.unit}>km</Text>
      </Card>
      <Card wrapperStyle={styles.boxWrapper} style={styles.box}>
        <Ionicons name="flame" size={13} color={colors.danger} />
        <Text style={styles.value}>{calories}</Text>
        <Text style={styles.unit}>kcal</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  boxWrapper: {
    flex: 1,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.ink,
  },
  unit: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.ink,
    opacity: 0.6,
  },
});
