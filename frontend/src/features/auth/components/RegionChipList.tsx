import { Pressable, StyleSheet, Text, View } from 'react-native';

import { REGIONS } from '../constants/regions';
import type { Region } from '../constants/regions';

type RegionChipListProps = {
  selected: Region | null;
  onSelect: (region: Region) => void;
};

const BORDER_COLOR = '#D1D5DB';
const SELECTED_BORDER_COLOR = '#2C6A47';
const SELECTED_BACKGROUND_COLOR = '#E8F5E9';
const LABEL_COLOR = '#374151';
const SELECTED_LABEL_COLOR = '#2C6A47';

const MIN_TOUCH_SIZE = 44;
const CHIP_GAP = 8;

export function RegionChipList({ selected, onSelect }: RegionChipListProps) {
  return (
    <View style={styles.container}>
      {REGIONS.map(({ value, label }) => {
        const isSelected = value === selected;

        return (
          <Pressable
            key={value}
            style={[styles.chip, isSelected ? styles.chipSelected : null]}
            onPress={() => onSelect(value)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected }}>
            <Text
              style={[styles.label, isSelected ? styles.labelSelected : null]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CHIP_GAP,
  },
  chip: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: SELECTED_BORDER_COLOR,
    backgroundColor: SELECTED_BACKGROUND_COLOR,
  },
  label: {
    fontSize: 14,
    color: LABEL_COLOR,
  },
  labelSelected: {
    fontWeight: '700',
    color: SELECTED_LABEL_COLOR,
  },
});
