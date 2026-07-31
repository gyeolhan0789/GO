import { useCallback, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/RootNavigator';
// 개발 단계: 온보딩 완료 저장 비활성화로 잠시 미사용.
import { useOnboardingStatus } from '../../shared/hooks/useOnboardingStatus';
import { OnboardingSlide } from './components/OnboardingSlide';
import { Pagination } from './components/Pagination';
import { ONBOARDING_SLIDES } from './slides';
import { AppText } from '../../shared/components/AppText/AppText';
import { controlHeight } from '../../shared/constants/sizing';
import { colors } from '../../shared/constants/colors';
import { bodyFont, lineHeights } from '../../shared/constants/typography';

type OnboardingNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

export function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<OnboardingNavigation>();
  const { complete } = useOnboardingStatus();

  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const lastIndex = ONBOARDING_SLIDES.length - 1;
  const isLastSlide = activeIndex >= lastIndex;

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex(nextIndex);
    },
    [width],
  );

  const finish = useCallback(async () => {
    // 저장이 실패해도 진행은 막지 않는다. 다음 실행에서 온보딩을 한 번 더 보게
    // 될 뿐이고, 여기서 사용자를 세워두는 편이 더 나쁘다.
    await complete().catch(() => {});
    // 온보딩 이후 권한 요청 플로우로 이동.
    navigation.reset({ index: 0, routes: [{ name: 'Permissions' }] });
  }, [complete, navigation]);

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      finish();
      return;
    }
    const nextIndex = activeIndex + 1;
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setActiveIndex(nextIndex);
  }, [activeIndex, finish, isLastSlide, width]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {ONBOARDING_SLIDES.map(slide => (
          <OnboardingSlide
            key={slide.key}
            slide={slide}
            width={width}
            height={height}
          />
        ))}
      </ScrollView>

      {!isLastSlide && (
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="온보딩 건너뛰기"
          hitSlop={12}
          style={[styles.skipButton, { top: insets.top + 8 }]}
        >
          <AppText style={styles.skipText}>건너뛰기</AppText>
        </Pressable>
      )}

      <View style={[styles.footer, { bottom: insets.bottom + 24 }]}>
        <Pagination
          count={ONBOARDING_SLIDES.length}
          activeIndex={activeIndex}
        />
        <Pressable
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLastSlide ? '시작하기' : '다음'}
          style={styles.nextButton}
        >
          <AppText style={styles.nextText}>
            {isLastSlide ? '시작하기' : '다음'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  skipText: {
    fontFamily: bodyFont.regular,
    fontSize: 15,
    lineHeight: lineHeights[15],
    color: colors.mutedStrong,
  },
  footer: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  nextButton: {
    marginTop: 24,
    height: controlHeight.lg,
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontFamily: bodyFont.bold,
    fontSize: 16,
    lineHeight: lineHeights[16],
    color: colors.surface,
  },
});
