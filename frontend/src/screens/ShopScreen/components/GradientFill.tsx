import { StyleSheet } from 'react-native';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

type GradientFillProps = {
  from: string;
  to: string;
  borderRadius: number;
};

// 모든 사용처가 같은 정의를 공유하므로 id는 고정해도 충돌이 없다.
const GRADIENT_ID = 'shopVerticalGradient';

/** 부모를 가득 채우는 세로 그라데이션 배경. 부모보다 먼저 렌더해서 뒤에 깔린다. */
export function GradientFill({ from, to, borderRadius }: GradientFillProps) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        rx={borderRadius}
        fill={`url(#${GRADIENT_ID})`}
      />
    </Svg>
  );
}
