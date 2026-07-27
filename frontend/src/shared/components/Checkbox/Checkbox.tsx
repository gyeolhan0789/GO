import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  /** 체크박스 우측에 놓일 라벨. 링크 등 리치 텍스트를 허용한다. */
  children: ReactNode;
  /** 스크린 리더가 읽을 전체 문구. children이 리치 텍스트라 별도로 받는다. */
  accessibilityLabel: string;
};

const BORDER_COLOR = '#C8D6CE';
const BOX_SIZE = 22;
const MIN_TOUCH_SIZE = 44;

export function Checkbox({
  checked,
  onToggle,
  children,
  accessibilityLabel,
}: CheckboxProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      hitSlop={spacing.sm}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null]}>
        {checked ? (
          <Ionicons name="checkmark" size={16} color={colors.surface} />
        ) : null}
      </View>
      <View style={styles.label}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_SIZE,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  label: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});
