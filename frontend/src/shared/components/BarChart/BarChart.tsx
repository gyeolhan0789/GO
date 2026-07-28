import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { spacing } from '../../constants/spacing';
import { fontFamily } from '../../constants/typography';

type BarChartDatum = {
  label: string;
  value: number;
  highlighted?: boolean;
};

type BarChartProps = {
  data: BarChartDatum[];
  height?: number;
};

const DEFAULT_HEIGHT = 140;
const TICK_COUNT = 3;

function formatTick(value: number): string {
  return value >= 1000 ? `${Math.round(value / 1000)}K` : `${value}`;
}

export function BarChart({ data, height = DEFAULT_HEIGHT }: BarChartProps) {
  const maxValue = Math.max(...data.map((datum) => datum.value), 1);
  const ticks = Array.from({ length: TICK_COUNT }, (_, index) =>
    Math.round((maxValue / TICK_COUNT) * (TICK_COUNT - index)),
  );

  return (
    <View style={styles.row}>
      <View style={[styles.tickColumn, { height }]}>
        {ticks.map((tick) => (
          <Text key={tick} style={styles.tickLabel}>
            {formatTick(tick)}
          </Text>
        ))}
      </View>
      <View style={styles.chart}>
        <View style={[styles.barArea, { height }]}>
          {data.map((datum) => (
            <View key={datum.label} style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: `${(datum.value / maxValue) * 100}%` },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.labelRow}>
          {data.map((datum) => (
            <Text
              key={datum.label}
              style={[styles.dayLabel, datum.highlighted && styles.dayLabelHighlighted]}
            >
              {datum.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  tickColumn: {
    justifyContent: 'space-between',
    marginRight: spacing.sm,
  },
  tickLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.ink,
    opacity: 0.5,
  },
  chart: {
    flex: 1,
  },
  barArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralBg,
  },
  barTrack: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: radius.xs,
    borderTopRightRadius: radius.xs,
    backgroundColor: colors.primary,
  },
  labelRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.ink,
  },
  dayLabelHighlighted: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
});
