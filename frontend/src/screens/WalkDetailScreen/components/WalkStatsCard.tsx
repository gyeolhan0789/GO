import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

import {
  formatDistance,
  formatDuration,
  formatThousands,
  formatWalkTimeRange,
} from '../../../features/history/model/format';
import type {
  WalkDetail,
  WalkDetailParticipant,
} from '../../../features/history/types';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';

type WalkStatsCardProps = {
  walk: WalkDetail;
  participant: WalkDetailParticipant;
};

type Stat = {
  icon: IoniconsIconName;
  value: string;
  unit?: string;
  label: string;
};

const ICON_SIZE = 32;

export function WalkStatsCard({ walk, participant }: WalkStatsCardProps) {
  const { stats } = participant;
  const distance = formatDistance(stats.distance);

  const items: Stat[] = [
    { icon: 'footsteps', value: formatThousands(stats.step), label: '걸음' },
    {
      icon: 'time',
      value: formatDuration(stats.durationSeconds),
      label: '시간',
    },
    {
      icon: 'location',
      value: distance.value,
      unit: distance.unit,
      label: '거리',
    },
    {
      icon: 'flame',
      value: formatThousands(stats.calories),
      unit: 'kcal',
      label: '칼로리',
    },
  ];

  return (
    <Card>
      <Text style={styles.title} numberOfLines={2}>
        {walk.title}
      </Text>
      <Text style={styles.timeRange}>
        {formatWalkTimeRange(walk.startedAt, walk.endedAt)}
      </Text>

      <View style={styles.divider} />

      <View style={styles.statRow}>
        {items.map((item, index) => (
          <View key={item.label} style={styles.statCell}>
            {index > 0 ? <View style={styles.statDivider} /> : null}
            <Ionicons
              name={item.icon}
              size={ICON_SIZE}
              color={colors.primarySoft}
            />
            <View style={styles.valueRow}>
              <Text style={styles.value} numberOfLines={1}>
                {item.value}
              </Text>
              {item.unit ? <Text style={styles.unit}>{item.unit}</Text> : null}
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: 'BMDOHYEON',
    fontSize: 16,
    color: colors.ink,
  },
  timeRange: {
    fontFamily: 'NotoSansKR-Medium',
    fontSize: 12,
    color: colors.ink,
    opacity: 0.5,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.infoBg,
    marginVertical: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.infoBg,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: spacing.xs,
  },
  value: {
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 13,
    lineHeight: 24,
    color: colors.ink,
  },
  unit: {
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.ink,
  },
  label: {
    fontFamily: 'NotoSansKR-Medium',
    fontSize: 12,
    lineHeight: 24,
    color: colors.ink,
    opacity: 0.5,
  },
});
