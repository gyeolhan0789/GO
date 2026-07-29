import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../constants/colors';
import { radius } from '../../constants/radius';
import { spacing } from '../../constants/spacing';
import { resolveMenuLeft } from './resolveMenuLeft';

export type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type SelectProps<T extends string> = {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 접근성 라벨 앞에 붙는 이름. '기간', '정렬' 등. */
  name: string;
  /** 생략하면 라벨 길이에 맞춰 늘어난다. */
  width?: number;
  /** 펼친 메뉴 너비(dp). */
  menuWidth?: number;
  /** 고른 값과 보여줄 글자가 다를 때(프리셋을 골라도 실제 날짜를 띄우는 식). */
  triggerLabel?: string;
  /** 'pill'은 둥근 옅은 테두리. 필터 줄처럼 여러 개가 나란히 놓일 때. */
  variant?: 'boxed' | 'pill';
};

const DEFAULT_MENU_WIDTH = 132;
const FALLBACK_MENU_TOP = 200;
const ICON_SIZE = 16;

/** 메뉴를 Modal로 띄운다. 부모 overflow에 잘리지 않고 리스트 위에 겹치려면 필요하다. */
export function Select<T extends string>({
  options,
  value,
  onChange,
  name,
  width,
  menuWidth = DEFAULT_MENU_WIDTH,
  triggerLabel,
  variant = 'boxed',
}: SelectProps<T>) {
  const triggerRef = useRef<View>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [isOpen, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(
    null,
  );

  const selectedLabel =
    options.find(option => option.value === value)?.label ?? '';

  // 측정을 기다리지 않고 먼저 연다. 측정이 안 되면 오버레이 정렬로 떨어진다.
  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, triggerWidth, height) => {
      setAnchor({
        top: y + height + spacing.xs,
        left: resolveMenuLeft({
          triggerX: x,
          triggerWidth,
          menuWidth,
          screenWidth,
        }),
      });
    });
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setAnchor(null);
  };

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        style={({ pressed }) => [
          styles.trigger,
          variant === 'pill' ? styles.triggerPill : styles.triggerBoxed,
          width === undefined ? null : { width },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${name} ${selectedLabel}`}
      >
        <Text style={styles.triggerLabel} numberOfLines={1}>
          {triggerLabel ?? selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={ICON_SIZE} color={colors.ink} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <View
            style={[
              styles.menu,
              { width: menuWidth },
              anchor && styles.menuAnchored,
              anchor && { top: anchor.top, left: anchor.left },
            ]}
          >
            {options.map(option => {
              const isSelected = option.value === value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    closeMenu();
                  }}
                  style={styles.option}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${name} ${option.label} 선택`}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected ? (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.successText}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    height: 36,
    backgroundColor: colors.surface,
  },
  triggerBoxed: {
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  triggerPill: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.neutralBg,
  },
  pressed: {
    opacity: 0.85,
  },
  triggerLabel: {
    flexShrink: 1,
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    color: colors.ink,
  },
  overlay: {
    flex: 1,
    // 측정 전 폴백 위치.
    alignItems: 'flex-end',
    paddingTop: FALLBACK_MENU_TOP,
    paddingHorizontal: spacing.lg,
  },
  menuAnchored: {
    position: 'absolute',
  },
  menu: {
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    paddingHorizontal: spacing.md,
  },
  optionLabel: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    color: colors.ink,
    opacity: 0.7,
  },
  optionLabelSelected: {
    color: colors.successText,
    opacity: 1,
  },
});
