import type { ImageSourcePropType } from 'react-native';

export type OnboardingSlideData = {
  key: string;
  title: string;
  description: string;
  /** 제목에서 초록색으로 강조할 단어(제목 안에 정확히 포함되어야 함). */
  highlight?: string;
  /** 전체화면 배경 이미지(원본 390 x 844). */
  background: ImageSourcePropType;
};

/**
 * 앱 소개 슬라이드. "Go!"의 핵심 흐름(산책 → 사진 미션 → 빙고 → 보상 →
 * 캐릭터)을 순서대로 안내한다. 제목/설명의 `\n`은 그대로 줄바꿈으로 렌더된다.
 */
export const ONBOARDING_SLIDES: OnboardingSlideData[] = [
  {
    key: 'walk',
    title: '혼자보다 함께 \n 더 즐거운 산책',
    highlight: '함께',
    description:
      '친구와 함께 걷고, 빙고를 달성해보세요. \n 혼자보다 더 오래, 재밌게 산책할 수 있어요',
    background: require('./assets/Onboarding1.png'),
  },
  {
    key: 'mission',
    title: '빙고로 산책을 \n 더 재밌게 즐겨요',
    highlight: '빙고',
    description:
      '걷는 동안 다양한 미션을 완료하고 \n 빙고 칸을 하나씩 채워보세요. \n 평범한 산책이 새로운 게임이 돼요.',
    background: require('./assets/Onboarding2.png'),
  },
  {
    key: 'bingo',
    title: '걸을수록 쌓이는 \n 리워드',
    highlight: '리워드',
    description:
      '빙고 미션을 클리어하고 \n 포인트를 모아 자신만의 캐릭터를 꾸며보세요',
    background: require('./assets/Onboarding3.png'),
  },
];
