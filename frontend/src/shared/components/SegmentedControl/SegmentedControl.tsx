import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { spacing } from '../../constants/spacing';
import { fontFamily } from '../../constants/typography';

type SegmentedControlOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, isActive && styles.segmentActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {option.label}
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
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
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
    color: colors.ink,
  },
  labelActive: {
    color: colors.successText,
  },
});
