import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { shadow } from '../../constants/shadow';
import { spacing } from '../../constants/spacing';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, style }: CardProps) {
  return (
    <View style={styles.wrapper}>
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
