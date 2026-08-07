import type { StyleProp, TextStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../AppText/AppText';
import { controlHeight } from '../../constants/sizing';
import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { shadow } from '../../constants/shadow';
import { spacing } from '../../constants/spacing';
import { fontFamily, lineHeights } from '../../constants/typography';

type SegmentedControlOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  labelStyle?: StyleProp<TextStyle>;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labelStyle,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {options.map(option => (
        <Segment
          key={option.value}
          label={option.label}
          isActive={option.value === value}
          onPress={() => onChange(option.value)}
          labelStyle={labelStyle}
        />
      ))}
    </View>
  );
}

function Segment({
  label,
  isActive,
  onPress,
  labelStyle,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  labelStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.shadowBox} />
      <Pressable
        onPress={onPress}
        style={[styles.segment, isActive && styles.segmentActive]}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <AppText
          style={[styles.label, isActive && styles.labelActive, labelStyle]}
        >
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  shadowBox: {
    position: 'absolute',
    top: shadow.offset,
    left: shadow.offset,
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
    height: controlHeight.row,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  segmentActive: {
    backgroundColor: colors.successBg,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  labelActive: {
    color: colors.successText,
  },
});
