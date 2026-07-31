import { StyleSheet, Text } from 'react-native';
import type { TextProps } from 'react-native';

import { MAX_FONT_SCALE, textStyles } from '../../constants/typography';

type TextVariant = keyof typeof textStyles;

type AppTextProps = TextProps & {
  /** typography 토큰을 골라 쓴다. 생략하면 style만 적용된다. */
  variant?: TextVariant;
};

/**
 * 앱의 모든 글자는 이 컴포넌트를 거친다.
 *
 * 안드로이드 TextView는 서체의 ascent/descent만큼 위아래 여백을 자동으로 넣는다.
 * NotoSansKR은 CJK를 담느라 이 값이 크고 위아래가 비대칭이라, 높이가 고정된
 * 버튼·뱃지·탭 안에서 글자가 아래로 밀린 것처럼 보인다. 여기서 한 번 끄고
 * 세로 정렬은 부모의 justifyContent에 맡긴다.
 *
 * style이 base와 variant보다 뒤에 오므로 화면 쪽에서 언제든 덮어쓸 수 있다.
 */
export function AppText({ variant, style, ...rest }: AppTextProps) {
  // 안드로이드는 lineHeight로 늘어난 여백을 글자 위쪽에 몰아준다. 그래서 한 줄
  // 짜리 라벨을 높이 고정된 상자에 넣으면 글자가 아래로 밀려 보인다. 한 줄이라고
  // 명시된 경우에만 상자 안에서 가운데로 맞춘다. 여러 줄 본문에는 걸지 않는다
  // (줄들이 통째로 가운데로 몰려 첫 줄 위치가 흔들린다).
  const isSingleLine = rest.numberOfLines === 1;

  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        styles.base,
        isSingleLine && styles.singleLine,
        variant ? textStyles[variant] : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
  singleLine: {
    textAlignVertical: 'center',
  },
});
