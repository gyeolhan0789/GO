import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';

type CharacterCardProps = {
  /** 캐릭터 이름. 이미지 아래에 표시. */
  name: string;
  /** 상점에서 커스터마이징한 현재 캐릭터 이미지. 아직 없으면 기본 아이콘으로 대체. */
  characterImageSource?: ImageSourcePropType;
  /** 패널 크기 제어용. 남는 세로 공간을 채울 때 flex: 1을 전달. */
  style?: StyleProp<ViewStyle>;
};

export function CharacterCard({
  name,
  characterImageSource,
  style,
}: CharacterCardProps) {
  return (
    <View style={[styles.panel, style]}>
      {characterImageSource ? (
        <Image
          source={characterImageSource}
          style={styles.characterImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.characterFallback}>
          <Ionicons name="person" size={48} color={colors.muted} />
        </View>
      )}
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  characterImage: {
    width: '85%',
    height: '90%',
  },
  characterFallback: {
    width: '85%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.ink,
  },
});
