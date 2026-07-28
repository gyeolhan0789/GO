import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { SHOP_CATEGORIES } from '../constants';
import type { ShopCategory } from '../types';
import { shadow } from '../../../shared/constants/shadow';

type CategoryTabsProps = {
  value: ShopCategory;
  onChange: (value: ShopCategory) => void;
};

export function CategoryTabs({ value, onChange }: CategoryTabsProps) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {SHOP_CATEGORIES.map(category => {
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
    </View>
  );
}

const TAB_HEIGHT = 32;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.pill,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: shadow.offset },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    height: TAB_HEIGHT,
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
