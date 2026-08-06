import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { CharacterLayers } from '../../../features/member/components/CharacterLayers';
import type { CharacterLayer } from '../../../features/member/model/character';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';

const BOB_DISTANCE = 6;
const BOB_DURATION_MS = 400;
// 캐릭터 이미지 캔버스 자체에 여백이 있어서, 박스만 키워선 안 커진다.
const CHARACTER_SCALE = 1.3;

// 캐릭터를 눌렀을 때 잠깐 보여줄 반응 문구. 풀에서 무작위로 고른다.
const TAP_REACTIONS = [
  '안녕!',
  '왜 불러요?',
  '헤헤, 간지러워요!',
  '심심했어요!',
  '오늘도 힘내봐요!',
];
const LONG_PRESS_REACTIONS = [
  '오늘도 같이 걸어줘서 고마워요!',
  '꽉 안아주는 거예요?',
];
const ANNOYED_REACTIONS = ['그만 찔러요, 간지러워요 ㅠㅠ', '살살 만져주세요!'];

const REACTION_DISPLAY_MS = 1600;
const LONG_PRESS_DISPLAY_MS = 2200;
// 이 시간 안에 이만큼 누르면 "그만 찔러요" 반응으로 바뀐다.
const MULTI_TAP_WINDOW_MS = 3000;
const MULTI_TAP_THRESHOLD = 5;
const SQUISH_DURATION_MS = 120;

function pickRandom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

type CharacterCardProps = {
  /** 캐릭터 이름. 이미지 아래에 표시. */
  name: string;
  /** 성별 기본 캐릭터. 아직 조회 전이면 기본 아이콘으로 대체된다. */
  baseImage: ImageSourcePropType | null;
  /** 서버 이미지가 로드에 실패할 때 대신 그릴 번들 에셋. */
  fallbackImage?: ImageSourcePropType | null;
  /** 아래에 깔릴 것부터 정렬된 착용 아이템(`selectLayerItems` 결과). */
  items: CharacterLayer[];
  /** 오늘 누적 거리(km). 말풍선 문구를 만드는 데만 쓴다. */
  distanceKm: number;
  /** 오늘 누적 칼로리(kcal). 말풍선 문구를 만드는 데만 쓴다. */
  calories: number;
  /** 패널 크기 제어용. 남는 세로 공간을 채울 때 flex: 1을 전달. */
  style?: StyleProp<ViewStyle>;
  /** 진행 중인 산책 세션이 있으면 뱃지를 띄우고 캐릭터를 살짝 흔든다. */
  isWalking?: boolean;
  /** isWalking일 때만 쓰는, "MM:SS" 형식으로 이미 포맷된 경과 시간. */
  walkElapsedLabel?: string;
  /** 뱃지를 눌렀을 때(진행 중인 산책 화면으로 이동). */
  onPressWalkBadge?: () => void;
};

/** 아직 오늘 걸은 기록이 없을 때는 숫자 대신 말을 건다. */
function buildSpeechMessage(distanceKm: number, calories: number): string {
  if (distanceKm <= 0 && calories <= 0) {
    return '오늘도 같이 걸어볼까요?';
  }
  return `오늘 ${distanceKm}km 걷고\n${calories}kcal 태웠어요!`;
}

export function CharacterCard({
  name,
  baseImage,
  fallbackImage,
  items,
  distanceKm,
  calories,
  style,
  isWalking = false,
  walkElapsedLabel,
  onPressWalkBadge,
}: CharacterCardProps) {
  const speechMessage = buildSpeechMessage(distanceKm, calories);

  // 탭/롱프레스하면 잠깐 이 문구가 speechMessage를 대신 덮는다.
  const [reactionMessage, setReactionMessage] = useState<string | null>(null);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimestampsRef = useRef<number[]>([]);
  const squishAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current);
      }
    };
  }, []);

  const showReaction = useCallback((message: string, durationMs: number) => {
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
    }
    setReactionMessage(message);
    reactionTimeoutRef.current = setTimeout(() => {
      setReactionMessage(null);
      reactionTimeoutRef.current = null;
    }, durationMs);
  }, []);

  const playSquish = useCallback(
    (peak: number) => {
      squishAnim.stopAnimation();
      Animated.sequence([
        Animated.timing(squishAnim, {
          toValue: peak,
          duration: SQUISH_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.spring(squishAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [squishAnim],
  );

  const handleTap = useCallback(() => {
    const now = Date.now();
    const recentTaps = [...tapTimestampsRef.current, now].filter(
      timestamp => now - timestamp < MULTI_TAP_WINDOW_MS,
    );
    tapTimestampsRef.current = recentTaps;

    if (recentTaps.length >= MULTI_TAP_THRESHOLD) {
      tapTimestampsRef.current = [];
      playSquish(0.8);
      showReaction(pickRandom(ANNOYED_REACTIONS), REACTION_DISPLAY_MS);
      return;
    }

    playSquish(0.85);
    showReaction(pickRandom(TAP_REACTIONS), REACTION_DISPLAY_MS);
  }, [playSquish, showReaction]);

  const handleLongPress = useCallback(() => {
    tapTimestampsRef.current = [];
    playSquish(1.15);
    showReaction(pickRandom(LONG_PRESS_REACTIONS), LONG_PRESS_DISPLAY_MS);
  }, [playSquish, showReaction]);

  const displayMessage = reactionMessage ?? speechMessage;

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
          <AppText style={styles.walkBadgeText}>
            산책 중 · {walkElapsedLabel}
          </AppText>
        </Pressable>
      ) : null}
      {isWalking ? null : (
        <View style={styles.speechBubble}>
          <Card style={styles.speechBubbleCard} shadow={false}>
            <AppText style={styles.speechBubbleText}>{displayMessage}</AppText>
          </Card>
          <View style={styles.speechBubbleTailWrap}>
            <View style={styles.speechBubbleTail} />
          </View>
        </View>
      )}
      <Pressable
        style={styles.characterBox}
        onPress={handleTap}
        onLongPress={handleLongPress}
        delayLongPress={450}
        accessibilityRole="button"
        accessibilityLabel="내 캐릭터, 눌러서 반응 보기"
      >
        <Animated.View
          style={[
            styles.characterInner,
            // transform을 배열↔null로 바꾸면 Fabric이 죽는 문제가 있어
            // 항상 배열로 유지한다. 정지시킬 땐 bobAnim을 0으로 되돌린다.
            {
              transform: [
                { translateY: bobTranslateY },
                { scale: squishAnim },
                { scale: CHARACTER_SCALE },
              ],
            },
          ]}
        >
          <CharacterLayers
            baseImage={baseImage}
            fallbackImage={fallbackImage}
            items={items}
            style={styles.characterLayers}
          />
        </Animated.View>
      </Pressable>
      <AppText style={styles.name}>{name}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  // 확대된 캐릭터가 박스 밖으로 번져도 말풍선이 항상 위에 보이게 한다.
  speechBubble: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    zIndex: 1,
  },
  speechBubbleCard: {
    maxWidth: '75%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  speechBubbleText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: lineHeights[12],
    color: colors.ink,
    textAlign: 'center',
  },
  // speechBubble이 자동 너비라 left: '50%'는 엉뚱한 기준으로 계산된다.
  // 대신 Wrap을 left:0/right:0으로 꽉 채우고 flexbox로 가운데 정렬한다.
  speechBubbleTailWrap: {
    position: 'absolute',
    bottom: -7,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // 정사각형을 45도 돌려 아래쪽 모서리가 뾰족하게 보이도록 한다.
  speechBubbleTail: {
    width: 14,
    height: 14,
    backgroundColor: colors.surface,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.ink,
    transform: [{ rotate: '45deg' }],
  },
  characterBox: {
    width: '95%',
    height: '60%',
  },
  characterInner: {
    flex: 1,
  },
  characterLayers: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: lineHeights[20],
    color: colors.ink,
    marginTop: spacing.sm,
  },
});
