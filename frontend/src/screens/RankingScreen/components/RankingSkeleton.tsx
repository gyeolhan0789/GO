import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';

// 실제 내용과 자리가 크게 어긋나면 값이 채워질 때 화면이 튄다. 시상대 블록과
// 목록 줄 높이는 PodiumCard·RankingRow와 같은 값을 쓴다.
const BLOCK_HEIGHT = [60, 84, 46];
const STAND_HEIGHT = 150;
const ROW_COUNT = 5;
const AVATAR_SIZE = 44;

const PULSE_DURATION_MS = 700;
const DIM_OPACITY = 0.45;

export function RankingSkeleton() {
  const pulse = usePulse();

  return (
    <Animated.View
      style={{ opacity: pulse }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="랭킹을 불러오는 중"
    >
      <View style={styles.stack}>
        <Card style={styles.podiumCard}>
          <View style={styles.podiumRow}>
            {BLOCK_HEIGHT.map((height, index) => (
              <View key={index} style={styles.place}>
                <View style={styles.stand}>
                  <View style={[styles.block, { height }]} />
                </View>
                <View style={styles.nameBar} />
                <View style={styles.stepsBar} />
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.listCard}>
          {Array.from({ length: ROW_COUNT }, (_, index) => (
            <View key={index} style={styles.row}>
              <View style={styles.rankBar} />
              <View style={styles.avatar} />
              <View style={styles.rowNameBar} />
              <View style={styles.rowStepsBar} />
            </View>
          ))}
        </Card>
      </View>
    </Animated.View>
  );
}

/** 옅어졌다 진해지기를 반복해 '멈춘 화면'이 아니라 로딩 중임을 알린다. */
function usePulse() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: DIM_OPACITY,
          duration: PULSE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  podiumCard: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  place: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  stand: {
    height: STAND_HEIGHT,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
  },
  block: {
    marginHorizontal: 2,
    borderTopLeftRadius: radius.xs,
    borderTopRightRadius: radius.xs,
    backgroundColor: colors.neutralBg,
  },
  nameBar: {
    width: '55%',
    height: 14,
    borderRadius: radius.xs,
    backgroundColor: colors.neutralBg,
  },
  stepsBar: {
    width: '70%',
    height: 12,
    borderRadius: radius.xs,
    backgroundColor: colors.neutralBg,
  },
  listCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  rankBar: {
    width: 20,
    height: 14,
    borderRadius: radius.xs,
    backgroundColor: colors.neutralBg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
  },
  rowNameBar: {
    flex: 1,
    height: 14,
    borderRadius: radius.xs,
    backgroundColor: colors.neutralBg,
  },
  rowStepsBar: {
    width: 64,
    height: 14,
    borderRadius: radius.xs,
    backgroundColor: colors.neutralBg,
  },
});
