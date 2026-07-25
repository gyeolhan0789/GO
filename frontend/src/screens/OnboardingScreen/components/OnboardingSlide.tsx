import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import type { OnboardingSlideData } from '../slides';

type OnboardingSlideProps = {
  slide: OnboardingSlideData;
  width: number;
  height: number;
};

const HIGHLIGHT_COLOR = '#27A34A';

// 배경 SVG 원본 비율(viewBox 390 x 844). 높이를 기기에 맞추고 폭은 이 비율로 둔다.
const BG_ASPECT_RATIO = 390 / 844;

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
      <Text style={styles.titleHighlight}>{highlight}</Text>
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

  // 높이는 기기에 맞추고 폭은 원본 비율대로. 세로 크롭 없이 가로 중앙 정렬.
  const backgroundWidth = height * BG_ASPECT_RATIO;

  return (
    <View style={[styles.container, { width, height }]}>
      <SvgXml
        xml={slide.backgroundXml}
        width={backgroundWidth}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        style={[styles.background, { left: (width - backgroundWidth) / 2 }]}
      />
      <View style={[styles.textOverlay, { paddingTop: insets.top + 80 }]}>
        <Text style={styles.title}>
          {renderTitle(slide.title, slide.highlight)}
        </Text>
        <Text style={styles.description}>{toMultiline(slide.description)}</Text>
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
  },
  textOverlay: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'BMDOHYEON',
    fontSize: 26,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 36,
  },
  titleHighlight: {
    color: HIGHLIGHT_COLOR,
  },
  description: {
    fontFamily: 'NotoSansKR',
    marginTop: 16,
    fontSize: 16,
    lineHeight: 22,
    color: '#4B5563',
    textAlign: 'center',
  },
});
