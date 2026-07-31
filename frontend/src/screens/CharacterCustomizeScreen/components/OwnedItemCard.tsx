import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { ItemThumbnail } from '../../../features/member/components/ItemThumbnail';
import type { CharacterItem } from '../../../features/member/model/character';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { bodyFont, lineHeights } from '../../../shared/constants/typography';

type OwnedItemCardProps = {
  item: CharacterItem;
  isEquipped: boolean;
  /** 누르면 입고, 입고 있는 아이템을 다시 누르면 벗는다. */
  onToggle: () => void;
};

const FALLBACK_ICON_SIZE = 28;

/**
 * 보유 아이템 카드. 상점의 아이템 카드(ShopItemCard)와 같은 겉모습을 쓴다 —
 * 두 화면이 같은 아이템을 다른 모양으로 그리면 같은 물건으로 안 보인다.
 * 차이는 하단 가격 버튼이 없다는 것뿐이고, 착용 여부는 상점과 같은 배지로
 * 알린다.
 */
export function OwnedItemCard({
  item,
  isEquipped,
  onToggle,
}: OwnedItemCardProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} ${isEquipped ? '벗기' : '착용하기'}`}
      accessibilityState={{ selected: isEquipped }}
    >
      <Card style={styles.card} shadow={false}>
        {isEquipped ? (
          <View style={styles.badgeSlot}>
            <Badge label="착용중" />
          </View>
        ) : null}

        <View style={styles.imageBox}>
          {item.image ? (
            <ItemThumbnail
              source={item.image}
              category={item.category}
              style={styles.image}
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
    padding: spacing.sm,
  },
  badgeSlot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  imageBox: {
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
});
