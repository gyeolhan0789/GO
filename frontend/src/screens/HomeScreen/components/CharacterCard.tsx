import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';
// TODO: 임시 배경. 최종 배경 자산으로 교체 예정.
import sceneMorning from '../assets/scene-temp.png';

type CharacterCardProps = {
  message: string;
  /** 상점에서 커스터마이징한 현재 캐릭터 이미지. 아직 없으면 기본 아이콘으로 대체. */
  characterImageSource?: ImageSourcePropType;
  /** 패널 크기 제어용. 남는 세로 공간을 채울 때 flex: 1을 전달. */
  style?: StyleProp<ViewStyle>;
};

export function CharacterCard({
  message,
  characterImageSource,
  style,
}: CharacterCardProps) {
  return (
    <ImageBackground
      source={sceneMorning}
      resizeMode="cover"
      style={[styles.panel, style]}
    >
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{message}</Text>
        <View style={styles.bubbleTail} />
      </View>

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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    // 위 카드들과 달리 배경 일러스트가 화면 좌우 끝까지 이어지도록, HomeScreen의
    // content padding(spacing.lg)만큼 음수 마진으로 상쇄한다.
    marginHorizontal: -spacing.lg,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    overflow: 'hidden',
    paddingTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bubble: {
    backgroundColor: colors.neutralBg,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  bubbleText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: colors.neutralBg,
    transform: [{ rotate: '45deg' }],
  },
  characterImage: {
    width: '55%',
    height: '70%',
  },
  characterFallback: {
    width: '55%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
