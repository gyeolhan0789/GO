import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { BottomSheet } from '../../../shared/components/BottomSheet/BottomSheet';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { textStyles } from '../../../shared/constants/typography';
import { REGIONS } from '../constants/regions';
import type { Region } from '../constants/regions';

type RegionDropdownProps = {
  selected: Region | null;
  onSelect: (region: Region) => void;
  invalid?: boolean;
  placeholder?: string;
};

const BORDER_COLOR = '#D1D5DB';
const ERROR_COLOR = '#DC2626';
const PLACEHOLDER_COLOR = '#9CA3AF';
const TEXT_COLOR = '#111827';

const FIELD_HEIGHT = 48;
const LIST_MAX_HEIGHT = 360;

export function RegionDropdown({
  selected,
  onSelect,
  invalid = false,
  placeholder = '지역을 선택하세요',
}: RegionDropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = REGIONS.find(
    region => region.value === selected,
  )?.label;

  return (
    <>
      <Pressable
        style={[styles.field, invalid ? styles.fieldError : null]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          selectedLabel ? `지역: ${selectedLabel}` : placeholder
        }
        accessibilityState={{ expanded: open }}
      >
        <Text
          style={[styles.fieldText, selectedLabel ? null : styles.placeholder]}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="지역 선택"
      >
        <ScrollView style={styles.list}>
          {REGIONS.map(({ value, label }) => {
            const isSelected = value === selected;

            return (
              <Pressable
                key={value}
                style={styles.option}
                onPress={() => {
                  onSelect(value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    textStyles.body,
                    isSelected ? styles.optionTextSelected : styles.optionText,
                  ]}
                >
                  {label}
                </Text>
                {isSelected ? (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: FIELD_HEIGHT,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
  },
  fieldError: {
    borderColor: ERROR_COLOR,
  },
  fieldText: {
    fontSize: 16,
    color: TEXT_COLOR,
  },
  placeholder: {
    color: PLACEHOLDER_COLOR,
  },
  list: {
    maxHeight: LIST_MAX_HEIGHT,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.successBg,
  },
  optionText: {
    color: colors.ink,
  },
  optionTextSelected: {
    color: colors.successText,
  },
});
