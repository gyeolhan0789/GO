import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';

type StatsBoxesProps = {
  distanceKm: number;
  calories: number;
};

export function StatsBoxes({ distanceKm, calories }: StatsBoxesProps) {
  return (
    <View style={styles.row}>
      <Card wrapperStyle={styles.boxWrapper} style={styles.box}>
        <View style={styles.iconBox}>
          <Ionicons name="flash" size={13} color={colors.successText} />
        </View>
        <AppText style={styles.value}>{distanceKm}</AppText>
        <AppText style={styles.unit}>km</AppText>
      </Card>
      <Card wrapperStyle={styles.boxWrapper} style={styles.box}>
        <View style={styles.iconBox}>
          <Ionicons name="flame" size={13} color={colors.danger} />
        </View>
        <AppText style={styles.value}>{calories}</AppText>
        <AppText style={styles.unit}>kcal</AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    // 오른쪽 카드의 오프셋 그림자(shadow.offset)가 캐러셀 페이지 폭에 딱 붙어
    // 옆 페이지로 삐져나오지 않도록 그만큼 여백을 남긴다.
    marginRight: shadow.offset,
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
  // 아이콘 폰트 글리프 자체의 좌우 여백(bearing)이 비대칭이라, 고정폭 박스로
  // 감싸 시각적 중심을 강제로 맞춘다.
  iconBox: {
    width: 16,
    alignItems: 'center',
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
  },
  unit: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: lineHeights[11],
    color: colors.ink,
    opacity: 0.6,
  },
});
