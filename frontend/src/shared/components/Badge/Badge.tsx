import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { spacing } from '../../constants/spacing';
import { fontFamily } from '../../constants/typography';

type BadgeVariant = 'success' | 'highlight';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  showDot?: boolean;
};

export function Badge({ label, variant = 'success', showDot = false }: BadgeProps) {
  const isSuccess = variant === 'success';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: isSuccess ? colors.successBg : colors.highlightBg },
      ]}
    >
      {showDot ? (
        <View
          style={[
            styles.dot,
            { backgroundColor: isSuccess ? colors.successText : colors.ink },
          ]}
        />
      ) : null}
      <Text
        style={[styles.label, { color: isSuccess ? colors.successText : colors.ink }]}
      >
        {label}
      </Text>
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
    fontFamily: fontFamily.bold,
    fontSize: 12,
  },
});
