import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';
import type { ItemCategory } from '../api/memberApi';
import { ITEM_CATEGORIES } from '../constants/itemCategories';

type CategoryTabsProps = {
  value: ItemCategory;
  onChange: (value: ItemCategory) => void;
};

/**
 * 아이템 카테고리 탭. 상점과 캐릭터 꾸미기가 같이 쓴다 — 같은 카테고리를
 * 화면마다 다른 모양으로 그리면 같은 분류로 안 보인다.
 *
 * 카테고리가 6종이라 좁은 화면에서는 균등 분할이 안 된다. 가로로 넘긴다.
 */
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
            <AppText style={[styles.label, isActive && styles.labelActive]}>
              {category.label}
            </AppText>
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
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  labelActive: {
    color: colors.surface,
    opacity: 1,
  },
});
