import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RankingScope } from '../../../features/ranking/api/rankingApi';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';

type RankingScopeTabsProps = {
  value: RankingScope;
  onChange: (value: RankingScope) => void;
};

// `GET /rankings`는 로그인 회원의 지역으로 좁혀 내려온다. '전체'가 아니다.
const SCOPES: { value: RankingScope; label: string }[] = [
  { value: 'friend', label: '친구 랭킹' },
  { value: 'region', label: '지역 랭킹' },
];

const TAB_HEIGHT = 44;

export function RankingScopeTabs({ value, onChange }: RankingScopeTabsProps) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {SCOPES.map(scope => {
        const isActive = scope.value === value;

        return (
          <Pressable
            key={scope.value}
            onPress={() => onChange(scope.value)}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {scope.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.neutralBg,
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
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: 'NotoSansKR-Bold',
    fontSize: 15,
    color: colors.ink,
    lineHeight: 20,
  },
  labelActive: {
    color: colors.surface,
  },
});
