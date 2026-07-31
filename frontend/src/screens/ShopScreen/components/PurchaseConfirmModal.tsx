import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ShopItem } from '../../../features/shop/model/shopItem';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { shadow } from '../../../shared/constants/shadow';
import { spacing } from '../../../shared/constants/spacing';
import { formatPoints, withObjectParticle } from '../format';
import { GradientFill } from './GradientFill';

type PurchaseConfirmModalProps = {
  /** null이면 닫힌 상태. 확인 중인 아이템을 그대로 받는다. */
  item: ShopItem | null;
  points: number;
  /** 요청 중에는 같은 아이템을 두 번 사지 않도록 확인 버튼을 잠근다. */
  isPurchasing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const IMAGE_SIZE = 56;

export function PurchaseConfirmModal({
  item,
  points,
  isPurchasing,
  onConfirm,
  onCancel,
}: PurchaseConfirmModalProps) {
  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityLabel="구매 확인 닫기"
        />

        {item ? (
          <View style={styles.dialogWrapper}>
            <View style={styles.shadowBox} />
            <View style={styles.dialog}>
              {item.image ? (
                <Image
                  source={item.image}
                  style={styles.image}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              ) : null}

              <Text style={styles.title}>
                {`${withObjectParticle(item.name)} 구매하시겠습니까?`}
              </Text>

              <View style={styles.summary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>가격</Text>
                  <Text style={styles.summaryValue}>
                    {formatPoints(item.price)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>구매 후 보유 포인트</Text>
                  <Text style={styles.summaryValue}>
                    {formatPoints(points - item.price)}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.action,
                    styles.cancelAction,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="구매 취소"
                >
                  <Text style={[styles.actionLabel, styles.cancelLabel]}>
                    취소
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onConfirm}
                  disabled={isPurchasing}
                  style={({ pressed }) => [
                    styles.action,
                    styles.confirmAction,
                    isPurchasing && styles.disabled,
                    pressed && !isPurchasing && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name} 구매 확인`}
                  accessibilityState={{ disabled: isPurchasing }}
                >
                  <GradientFill
                    from={colors.primarySoftLight}
                    to={colors.primarySoftDark}
                    borderRadius={radius.sm}
                  />
                  <Text style={[styles.actionLabel, styles.confirmLabel]}>
                    {isPurchasing ? '구매 중...' : '구매하기'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
  },
  dialogWrapper: {
    alignSelf: 'stretch',
    maxWidth: 320,
    paddingRight: shadow.offset,
    paddingBottom: shadow.offset,
  },
  shadowBox: {
    position: 'absolute',
    top: shadow.offset,
    left: shadow.offset,
    right: 0,
    bottom: 0,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  dialog: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  title: {
    fontFamily: 'BMDOHYEON',
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  summary: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.successBg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryLabel: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    color: colors.successText,
    opacity: 0.8,
  },
  summaryValue: {
    fontFamily: 'BMDOHYEON',
    fontSize: 13,
    color: colors.successText,
  },
  actions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  cancelAction: {
    borderWidth: 1.5,
    borderColor: colors.muted,
    backgroundColor: colors.surface,
  },
  // 그라데이션 렌더 전/실패 시를 위한 단색 폴백.
  confirmAction: {
    backgroundColor: colors.primarySoft,
  },
  actionLabel: {
    fontFamily: 'BMDOHYEON',
    fontSize: 15,
  },
  cancelLabel: {
    color: colors.ink,
    opacity: 0.7,
  },
  confirmLabel: {
    color: colors.surface,
  },
});
