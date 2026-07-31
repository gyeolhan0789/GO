import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../AppText/AppText';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { textStyles } from '../../constants/typography';

type HeaderProps = {
  title: string;
  subtitle?: string;
  /** Shows a back chevron and calls this instead of `icon` when provided. */
  onBack?: () => void;
  /** Leading icon for tab-root screens that don't navigate back (e.g. 🏆). */
  icon?: ReactNode;
  /** 제목 줄 오른쪽 끝에 붙는 요소(상점의 포인트 뱃지 등). */
  trailing?: ReactNode;
};

const LEADING_SIZE = 28;

export function Header({
  title,
  subtitle,
  onBack,
  icon,
  trailing,
}: HeaderProps) {
  const hasLeading = Boolean(onBack) || icon != null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.titleRow}>
          {hasLeading ? (
            <View style={styles.leading}>
              {onBack ? (
                <Pressable onPress={onBack} hitSlop={8}>
                  <Ionicons name="chevron-back" size={24} color={colors.ink} />
                </Pressable>
              ) : (
                icon
              )}
            </View>
          ) : null}
          <AppText style={textStyles.pageTitle}>{title}</AppText>
        </View>
        {trailing}
      </View>
      {/* 부제는 trailing과 같은 줄에 두지 않는다. 뱃지에 폭을 뺏겨 한 줄짜리
          문구가 줄바꿈된다. 제목 줄 아래에서 헤더 전체 폭을 쓴다. */}
      {subtitle ? (
        <AppText
          style={[
            styles.subtitle,
            hasLeading && { marginLeft: LEADING_SIZE + spacing.sm },
          ]}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // 좌우 여백은 일부러 주지 않는다. 화면마다 본문 컨테이너가 이미
    // paddingHorizontal: spacing.lg를 갖고 있어서, 여기서 또 주면 제목만
    // 본문보다 안쪽으로 밀려 들어간다. 화면의 여백 안에 넣어서 쓴다.
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  leading: {
    width: LEADING_SIZE,
    marginRight: spacing.sm,
  },
  subtitle: {
    ...textStyles.caption,
    marginTop: 2,
    color: colors.ink,
    opacity: 0.5,
  },
});
