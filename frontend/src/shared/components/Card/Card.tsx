import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { spacing } from '../../constants/spacing';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
