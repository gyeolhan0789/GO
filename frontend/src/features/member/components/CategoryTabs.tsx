import { Pressable, StyleSheet, View } from 'react-native';

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
 * 탭은 남은 폭을 똑같이 나눠 갖는다. 내용만큼만 넓히면(가로 스크롤) 카테고리 수에
 * 따라 오른쪽에 빈자리가 남아 띠가 덜 채워져 보인다. 대신 카테고리가 늘면 한 칸이
 * 좁아지므로, 글자가 잘리기 시작하면 그때 가로 스크롤로 되돌리는 게 맞다.
 */
export function CategoryTabs({ value, onChange }: CategoryTabsProps) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
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
            <AppText
              style={[styles.label, isActive && styles.labelActive]}
              numberOfLines={1}
            >
              {category.label}
            </AppText>
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
    alignItems: 'center',
    padding: spacing.xs,
    gap: spacing.xs,
    borderRadius: radius.pill,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: shadow.offset },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  tab: {
    // 좌우 여백을 따로 주지 않는다. 한 칸이 이미 균등 분할된 폭이라, 여백을 더하면
    // 긴 이름(액세서리)이 좁은 화면에서 먼저 잘린다.
    flex: 1,
    minWidth: 0,
    height: TAB_HEIGHT,
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
