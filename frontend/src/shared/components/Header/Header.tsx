import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

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
};

const LEADING_SIZE = 28;

export function Header({ title, subtitle, onBack, icon }: HeaderProps) {
  const hasLeading = Boolean(onBack) || icon != null;

  return (
    <View style={styles.container}>
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
        <Text style={textStyles.heading2}>{title}</Text>
      </View>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            hasLeading && { marginLeft: LEADING_SIZE + spacing.sm },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
