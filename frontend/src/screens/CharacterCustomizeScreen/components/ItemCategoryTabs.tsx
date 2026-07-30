import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ITEM_CATEGORIES } from '../../../features/member/constants/itemCategories';
import type { ItemCategory } from '../../../features/member/api/memberApi';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type ItemCategoryTabsProps = {
  value: ItemCategory;
  onChange: (value: ItemCategory) => void;
};

const TAB_HEIGHT = 36;

/** 카테고리가 6종이라 좁은 화면에서는 균등 분할이 안 된다. 가로로 넘긴다. */
export function ItemCategoryTabs({ value, onChange }: ItemCategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}
      accessibilityRole="tablist"
    >
      {ITEM_CATEGORIES.map(category => {
        const isActive = category.value === value;

        return (
          <Pressable
            key={category.value}
            onPress={() => onChange(category.value)}
            style={[styles.tab, isActive && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tab: {
    height: TAB_HEIGHT,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
    backgroundColor: colors.surface,
  },
  tabActive: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySoft,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
  },
  labelActive: {
    color: colors.surface,
  },
});
