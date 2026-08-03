import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../AppText/AppText';
import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { spacing } from '../../constants/spacing';
import { bodyFont, lineHeights } from '../../constants/typography';

type BadgeVariant = 'success' | 'highlight' | 'info' | 'danger';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  showDot?: boolean;
  labelStyle?: StyleProp<TextStyle>;
};

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.successBg, text: colors.successText },
  highlight: { bg: colors.highlightBg, text: colors.ink },
  info: { bg: colors.infoBg, text: colors.infoText },
  danger: { bg: colors.dangerBg, text: colors.danger },
};

export function Badge({
  label,
  variant = 'success',
  showDot = false,
  labelStyle,
}: BadgeProps) {
  const { bg, text } = VARIANT_COLORS[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {showDot ? (
        <View style={[styles.dot, { backgroundColor: text }]} />
      ) : null}
      <AppText style={[styles.label, { color: text }, labelStyle]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    marginRight: spacing.xs,
  },
  label: {
    fontFamily: bodyFont.bold,
    fontSize: 12,
    lineHeight: lineHeights[12],
  },
});
