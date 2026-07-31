import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import type { CharacterItem } from '../../../features/member/model/character';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type OwnedItemCardProps = {
  item: CharacterItem;
  isEquipped: boolean;
  /** 누르면 입고, 입고 있는 아이템을 다시 누르면 벗는다. */
  onToggle: () => void;
};

const IMAGE_SIZE = 64;
const FALLBACK_ICON_SIZE = 28;

export function OwnedItemCard({
  item,
  isEquipped,
  onToggle,
}: OwnedItemCardProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.card,
        isEquipped && styles.cardEquipped,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} ${isEquipped ? '벗기' : '착용하기'}`}
      accessibilityState={{ selected: isEquipped }}
    >
      <View style={styles.imageBox}>
        {item.image ? (
          <Image
            source={item.image}
            style={styles.image}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Ionicons
            name="image-outline"
            size={FALLBACK_ICON_SIZE}
            color={colors.muted}
          />
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>

      {isEquipped ? <Text style={styles.equippedLabel}>착용중</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.neutralBg,
    backgroundColor: colors.surface,
  },
  cardEquipped: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.successBg,
  },
  pressed: {
    opacity: 0.85,
  },
  imageBox: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.ink,
    paddingHorizontal: spacing.xs,
  },
  equippedLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.successText,
  },
});
