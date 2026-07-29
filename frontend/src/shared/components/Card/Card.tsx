import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { shadow } from '../../constants/shadow';
import { spacing } from '../../constants/spacing';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** Sizing (flex, width, height) for the outer box — the shadow/border box that's the actual layout item in the parent. */
  wrapperStyle?: StyleProp<ViewStyle>;
}>;

export function Card({ children, style, wrapperStyle }: CardProps) {
  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      <View style={styles.shadowBox} />
      <View style={[styles.card, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  shadowBox: {
    position: 'absolute',
    top: shadow.offset,
    left: shadow.offset,
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
