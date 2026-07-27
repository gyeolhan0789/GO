import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type StatsRowProps = {
  steps: number;
  calories: number;
  minutes: number;
};

function formatWithComma(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function StatsRow({ steps, calories, minutes }: StatsRowProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.item}>
        <Text style={styles.label}>오늘 걸음</Text>
        <Text style={[styles.value, styles.stepsValue]}>
          {formatWithComma(steps)}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.label}>칼로리</Text>
        <Text style={styles.value}>{calories}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.label}>운동 시간</Text>
        <Text style={styles.value}>{minutes}분</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  divider: {
    width: 1,
    backgroundColor: colors.neutralBg,
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.ink,
    opacity: 0.6,
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.ink,
  },
  stepsValue: {
    color: colors.successText,
  },
});
