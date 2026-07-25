import { StyleSheet, View } from 'react-native';

type PaginationProps = {
  count: number;
  activeIndex: number;
};

export function Pagination({ count, activeIndex }: PaginationProps) {
  return (
    <View style={styles.container} accessibilityElementsHidden>
      {Array.from({ length: count }).map((_, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#2C6A47',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#d1d5db',
  },
});
