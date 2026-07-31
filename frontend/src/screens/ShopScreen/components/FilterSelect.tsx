import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { controlHeight } from '../../../shared/constants/sizing';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';
import { SHOP_FILTERS } from '../constants';
import type { ShopFilter } from '../types';

type FilterSelectProps = {
  value: ShopFilter;
  onChange: (value: ShopFilter) => void;
};

type Anchor = { top: number; left: number };

const MENU_WIDTH = 164;
const FALLBACK_MENU_TOP = 240;

export function FilterSelect({ value, onChange }: FilterSelectProps) {
  const triggerRef = useRef<View>(null);
  const [isOpen, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const selected = SHOP_FILTERS.find(filter => filter.value === value);
  // 전체일 때는 디자인대로 '필터' 플레이스홀더를 보여준다.
  const triggerLabel = value === 'all' ? '필터' : selected?.label ?? '필터';

  // 측정 결과를 기다리지 않고 먼저 연다. 측정이 안 되는 환경에서도
  // 메뉴가 뜨도록 오버레이 정렬(우측 상단)을 폴백으로 둔다.
  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y + height + spacing.xs, left: x + width - MENU_WIDTH });
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
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`필터 ${selected?.label ?? '전체'}`}
      >
        <AppText style={styles.triggerLabel}>{triggerLabel}</AppText>
        <Ionicons name="chevron-down" size={16} color={colors.ink} />
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
              anchor && styles.menuAnchored,
              anchor && { top: anchor.top, left: anchor.left },
            ]}
          >
            {SHOP_FILTERS.map(filter => {
              const isSelected = filter.value === value;

              return (
                <Pressable
                  key={filter.value}
                  onPress={() => {
                    onChange(filter.value);
                    closeMenu();
                  }}
                  style={styles.option}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                >
                  <AppText
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {filter.label}
                  </AppText>
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
    gap: spacing.xs,
    height: controlHeight.compact,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  triggerLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 13,
    color: colors.ink,
    lineHeight: lineHeights[13],
  },
  overlay: {
    flex: 1,
    // 측정 전 폴백 위치: 트리거가 있는 우측 상단 근처.
    alignItems: 'flex-end',
    paddingTop: FALLBACK_MENU_TOP,
    paddingHorizontal: spacing.lg,
  },
  menuAnchored: {
    position: 'absolute',
  },
  menu: {
    width: MENU_WIDTH,
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
    height: controlHeight.row,
    paddingHorizontal: spacing.md,
  },
  optionLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.7,
  },
  optionLabelSelected: {
    color: colors.successText,
    opacity: 1,
  },
});
