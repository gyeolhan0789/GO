import { useEffect, useRef } from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';

const BOB_DISTANCE = 6;
const BOB_DURATION_MS = 400;

type CharacterCardProps = {
  /** 캐릭터 이름. 이미지 아래에 표시. */
  name: string;
  /** 상점에서 커스터마이징한 현재 캐릭터 이미지. 아직 없으면 기본 아이콘으로 대체. */
  characterImageSource?: ImageSourcePropType;
  /** 패널 크기 제어용. 남는 세로 공간을 채울 때 flex: 1을 전달. */
  style?: StyleProp<ViewStyle>;
  /** 진행 중인 산책 세션이 있으면 뱃지를 띄우고 캐릭터를 살짝 흔든다. */
  isWalking?: boolean;
  /** isWalking일 때만 쓰는, "MM:SS" 형식으로 이미 포맷된 경과 시간. */
  walkElapsedLabel?: string;
  /** 뱃지를 눌렀을 때(진행 중인 산책 화면으로 이동). */
  onPressWalkBadge?: () => void;
};

export function CharacterCard({
  name,
  characterImageSource,
  style,
  isWalking = false,
  walkElapsedLabel,
  onPressWalkBadge,
}: CharacterCardProps) {
  // 새 걷기 애니메이션 에셋이 없어서, 정지 이미지를 위아래로 살짝
  // 반복시켜 걷는 느낌만 흉내낸다.
  const bobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isWalking) {
      bobAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 1,
          duration: BOB_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: BOB_DURATION_MS,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isWalking, bobAnim]);

  const bobTranslateY = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -BOB_DISTANCE],
  });

  return (
    <View style={[styles.panel, style]}>
      {isWalking ? (
        <Pressable
          style={styles.walkBadge}
          onPress={onPressWalkBadge}
          accessibilityRole="button"
          accessibilityLabel="진행 중인 산책으로 이동"
        >
          <AppText style={styles.walkBadgeText}>산책 중 · {walkElapsedLabel}</AppText>
        </Pressable>
      ) : null}
      {characterImageSource ? (
        <Animated.Image
          source={characterImageSource}
          style={[
            styles.characterImage,
            // transform을 isWalking에 따라 배열↔null로 바꾸면(네이티브 드라이버가
            // 이미 이 뷰의 transform을 직접 갱신 중인 상태에서) Fabric이 새
            // 커밋 값과 병합하다 SurfaceMountingManager의 어서션에 걸려 앱이
            // 죽는 문제가 있었다. transform은 항상 배열로 유지하고, 정지시킬
            // 때는 위 useEffect에서 bobAnim 자체를 0으로 되돌리는 것만으로
            // 충분하다.
            { transform: [{ translateY: bobTranslateY }] },
          ]}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.characterFallback}>
          <Ionicons name="person" size={48} color={colors.muted} />
        </View>
      )}
      <AppText style={styles.name}>{name}</AppText>
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
  walkBadge: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    backgroundColor: colors.successBg,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    zIndex: 1,
  },
  walkBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.successText,
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
    lineHeight: lineHeights[20],
    color: colors.ink,
  },
});
