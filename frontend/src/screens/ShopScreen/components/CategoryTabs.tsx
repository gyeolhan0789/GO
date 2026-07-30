import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { ItemCategory } from '../../../features/member/api/memberApi';
import { ITEM_CATEGORIES } from '../../../features/member/constants/itemCategories';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { shadow } from '../../../shared/constants/shadow';

type CategoryTabsProps = {
  value: ItemCategory;
  onChange: (value: ItemCategory) => void;
};

/** 카테고리가 6종이라 좁은 화면에서는 균등 분할이 안 된다. 가로로 넘긴다. */
export function CategoryTabs({ value, onChange }: CategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.track}
      contentContainerStyle={styles.trackContent}
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

const TAB_HEIGHT = 32;

const styles = StyleSheet.create({
  track: {
    // ScrollView는 남은 높이를 다 먹는다. 탭 한 줄 높이에 맞춘다.
    flexGrow: 0,
    borderRadius: radius.pill,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: shadow.offset },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  trackContent: {
    alignItems: 'center',
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    height: TAB_HEIGHT,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    fontFamily: 'NotoSansKR-Medium',
    fontSize: 14,
    color: colors.ink,
  },
  labelActive: {
    color: colors.surface,
    opacity: 1,
  },
});
