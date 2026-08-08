import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '../../../shared/components/AppText/AppText';
import { colors } from '../../../shared/constants/colors';
import {
  bodyFont,
  fontFamily,
  lineHeights,
} from '../../../shared/constants/typography';

import type { OnboardingSlideData } from '../slides';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OnboardingSlideProps = {
  slide: OnboardingSlideData;
  width: number;
  height: number;
};

const HIGHLIGHT_COLOR = colors.primary;

function toMultiline(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n');
}

// 제목에서 강조 단어를 초록색으로 렌더한다. (\n 줄바꿈은 그대로 유지)
function renderTitle(title: string, highlight?: string): ReactNode {
  const text = toMultiline(title);
  if (!highlight) {
    return text;
  }
  const index = text.indexOf(highlight);
  if (index === -1) {
    return text;
  }
  return (
    <>
      {text.slice(0, index)}
      <AppText style={styles.titleHighlight}>{highlight}</AppText>
      {text.slice(index + highlight.length)}
    </>
  );
}

export function OnboardingSlide({
  slide,
  width,
  height,
}: OnboardingSlideProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { width, height }]}>
      <Image
        source={slide.background}
        style={[styles.background, { height }]}
        resizeMode="contain"
      />
      <View style={[styles.textOverlay, { paddingTop: insets.top + 80 }]}>
        <AppText style={styles.title}>
          {renderTitle(slide.title, slide.highlight)}
        </AppText>
        <AppText style={styles.description}>
          {toMultiline(slide.description)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-start',
  },
  background: {
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  textOverlay: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 26,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: lineHeights[26],
    marginTop: 12,
  },
  titleHighlight: {
    color: HIGHLIGHT_COLOR,
  },
  description: {
    fontFamily: bodyFont.regular,
    marginTop: 11,
    fontSize: 14,
    lineHeight: lineHeights[12],
    color: colors.inkMuted,
    textAlign: 'center',
  },
});
