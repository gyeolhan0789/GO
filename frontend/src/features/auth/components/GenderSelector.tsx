import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../../shared/components/AppText/AppText';
import { GENDERS } from '../constants/genders';
import type { Gender } from '../constants/genders';
import { colors } from '../../../shared/constants/colors';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type GenderSelectorProps = {
  selected: Gender | null;
  onSelect: (gender: Gender) => void;
};

const BORDER_COLOR = colors.border;
const SELECTED_BORDER_COLOR = colors.primaryDark;
const SELECTED_BACKGROUND_COLOR = colors.successBg;
const LABEL_COLOR = colors.inkSoft;
const SELECTED_LABEL_COLOR = colors.primaryDark;

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
            <AppText
              style={[styles.label, isSelected ? styles.labelSelected : null]}>
              {label}
            </AppText>
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
    fontFamily: bodyFont.regular,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: LABEL_COLOR,
  },
  labelSelected: {
    fontFamily: bodyFont.bold,
    color: SELECTED_LABEL_COLOR,
  },
});
