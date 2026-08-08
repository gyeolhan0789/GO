import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { CharacterBust } from '../../../features/member/components/CharacterBust';
import { PointBadge } from '../../../features/member/components/PointBadge';
import type { Character } from '../../../features/member/model/character';
import {
  selectLayerItems,
  toEquippedByCategory,
} from '../../../features/member/model/equippedItems';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';

type HomeHeaderProps = {
  points: number;
  /** 내 캐릭터. 아직 조회 전이면 기본 아이콘으로 나온다. */
  character?: Character;
  /** 프로필 사진을 누르면 마이페이지로 간다. */
  onProfilePress: () => void;
  /** 종 아이콘을 누르면 알림 목록으로 간다. */
  onNotificationPress: () => void;
};

export function HomeHeader({
  points,
  character,
  onProfilePress,
  onNotificationPress,
}: HomeHeaderProps) {
  // 마이페이지·랭킹과 같은 순서로 겹쳐야 같은 조합이 화면마다 똑같이 보인다.
  const layers = selectLayerItems(
    toEquippedByCategory(character?.equippedItems ?? []),
  );

  return (
    <View style={styles.container}>
      <PointBadge points={points} />
      <View style={styles.actions}>
        <Pressable
          onPress={onNotificationPress}
          style={({ pressed }) => [
            styles.notificationButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="알림 목록"
        >
          <Ionicons name="notifications-outline" size={24} color={colors.ink} />
        </Pressable>
        <Pressable
          onPress={onProfilePress}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="프로필 설정"
        >
          <CharacterBust
            baseImage={character?.baseImage ?? null}
            fallbackImage={character?.baseImageFallback ?? null}
            items={layers}
            style={styles.avatarBust}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 원 테두리 디자인은 CharacterBust가 모든 화면 공통으로 그린다.
  avatar: {
    width: 32,
    height: 32,
  },
  avatarBust: {
    width: '100%',
    height: '100%',
  },
});
