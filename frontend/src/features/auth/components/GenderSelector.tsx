import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GENDERS } from '../constants/genders';
import type { Gender } from '../constants/genders';

type GenderSelectorProps = {
  selected: Gender | null;
  onSelect: (gender: Gender) => void;
};

const BORDER_COLOR = '#D1D5DB';
const SELECTED_BORDER_COLOR = '#2C6A47';
const SELECTED_BACKGROUND_COLOR = '#E8F5E9';
const LABEL_COLOR = '#374151';
const SELECTED_LABEL_COLOR = '#2C6A47';

const MIN_TOUCH_SIZE = 44;
const OPTION_GAP = 8;

export function GenderSelector({ selected, onSelect }: GenderSelectorProps) {
  return (
    <View style={styles.container}>
      {GENDERS.map(({ value, label }) => {
        const isSelected = value === selected;

        return (
          <Pressable
            key={value}
            style={[styles.option, isSelected ? styles.optionSelected : null]}
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
    gap: OPTION_GAP,
  },
  option: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionSelected: {
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
