import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { ItemThumbnail } from '../../../features/member/components/ItemThumbnail';
import type { ShopItem } from '../../../features/shop/model/shopItem';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Card } from '../../../shared/components/Card/Card';
import { controlHeight } from '../../../shared/constants/sizing';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';
import { formatPoints } from '../../../shared/lib/formatPoints';
import { GradientFill } from './GradientFill';

type ShopItemCardProps = {
  item: ShopItem;
  isEquipped: boolean;
  /** 카드 터치 = 착용해보기. 보유 여부와 무관하게 미리 입어볼 수 있다. */
  onTryOn: () => void;
  /** 하단 가격 버튼 터치 = 구매. 미보유일 때만 눌린다. */
  onPurchase: () => void;
};

const FALLBACK_ICON_SIZE = 28;

export function ShopItemCard({
  item,
  isEquipped,
  onTryOn,
  onPurchase,
}: ShopItemCardProps) {
  const [isImageBroken, setImageBroken] = useState(false);

  // 보유 여부가 버튼을 결정한다. 착용(미리보기)은 버튼이 아니라 배지로 표시하므로,
  // 미보유 아이템을 입어봐도 가격 버튼은 그대로 남는다.
  const actionState = !item.owned ? 'buy' : isEquipped ? 'equipped' : 'owned';
  const actionLabel =
    actionState === 'buy'
      ? formatPoints(item.price)
      : actionState === 'equipped'
      ? '착용중'
      : '보유중';

  return (
    <Pressable
      onPress={onTryOn}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} ${
        isEquipped ? '착용중' : '착용해보기'
      }`}
      accessibilityState={{ selected: isEquipped }}
    >
      <Card style={styles.card} shadow={false}>
        {isEquipped ? (
          <View style={styles.badgeSlot}>
            <Badge label="착용중" />
          </View>
        ) : null}

        <View style={styles.imageBox}>
          {item.image && !isImageBroken ? (
            <ItemThumbnail
              source={item.image}
              category={item.category}
              style={styles.image}
              // 실패해도 빈 상자만 남으면 "이미지가 없는 아이템"과 구분되지
              // 않는다. 자리표시 아이콘으로 넘겨서 최소한 카드 모양은 유지한다.
              onError={() => setImageBroken(true)}
            />
          ) : (
            <Ionicons
              name="image-outline"
              size={FALLBACK_ICON_SIZE}
              color={colors.muted}
            />
          )}
        </View>

        <AppText style={styles.name} numberOfLines={1}>
          {item.name}
        </AppText>

        {actionState === 'buy' ? (
          <Pressable
            onPress={onPurchase}
            style={({ pressed }) => [
              styles.action,
              styles.buyBox,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} 구매 ${actionLabel}`}
          >
            <GradientFill
              from={colors.primarySoftLight}
              to={colors.primarySoftDark}
              borderRadius={radius.sm}
            />
            <AppText style={[styles.actionLabel, styles.buyLabel]}>
              {actionLabel}
            </AppText>
          </Pressable>
        ) : (
          <View style={[styles.action, ACTION_STYLES[actionState].box]}>
            <AppText
              style={[styles.actionLabel, ACTION_STYLES[actionState].label]}
            >
              {actionLabel}
            </AppText>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    // 3열 그리드라 Card 기본 padding(md)이면 이미지 자리가 안 남는다.
    padding: spacing.sm,
  },
  badgeSlot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  imageBox: {
    // 고정 크기 대신 칸 폭을 따라간다. 열 수나 기기 폭이 바뀌어도 카드 안에서
    // 넘치지 않고 항상 정사각형을 유지한다.
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  name: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
  },
  action: {
    alignSelf: 'stretch',
    height: controlHeight.compact,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    overflow: 'hidden',
    // 상태가 바뀔 때 borderWidth가 생겼다 없어지면 안드로이드에서 이전 테두리가
    // 남거나 안쪽 높이가 흔들린다. 폭은 고정하고 상태별로 색만 바꾼다.
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  actionLabel: {
    fontFamily: bodyFont.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
  },
  buyBox: {
    backgroundColor: colors.primarySoft,
  },
  buyLabel: {
    color: colors.surface,
  },
  // muted(#9CA3AF) 위의 흰 글씨는 대비 2.3:1이라 글자가 안 보인다.
  // mutedStrong은 흰 글씨 대비 4.8:1로 WCAG AA를 통과한다.
  ownedBox: {
    backgroundColor: colors.mutedStrong,
  },
  ownedLabel: {
    color: colors.surface,
  },
  equippedBox: {
    backgroundColor: colors.successBg,
    borderColor: colors.primarySoft,
  },
  equippedLabel: {
    color: colors.successText,
  },
});

const ACTION_STYLES = {
  owned: { box: styles.ownedBox, label: styles.ownedLabel },
  equipped: { box: styles.equippedBox, label: styles.equippedLabel },
} as const;
