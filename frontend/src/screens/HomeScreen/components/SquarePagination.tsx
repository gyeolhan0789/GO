import { StyleSheet, View } from 'react-native';

import { colors } from '../../../shared/constants/colors';

type SquarePaginationProps = {
  count: number;
  activeIndex: number;
};

export function SquarePagination({ count, activeIndex }: SquarePaginationProps) {
  return (
    <View style={styles.container} accessibilityElementsHidden>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  dotActive: {
    backgroundColor: colors.ink,
  },
  dotInactive: {
    backgroundColor: 'transparent',
  },
});
