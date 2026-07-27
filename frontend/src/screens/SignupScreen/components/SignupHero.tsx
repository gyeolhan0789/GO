import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import heroXml from '../assets/SignupHero';

// 배너 원본 비율(viewBox 440 x 201.053). 폭을 화면에 맞추고 높이를 비율로 둔다.
const HERO_WIDTH = 440;
const HERO_HEIGHT = 201.053;
const HERO_ASPECT_RATIO = HERO_HEIGHT / HERO_WIDTH;

// 배너 상단 하늘색. 상태바 영역을 이 색으로 채워 사진 위쪽과 자연스럽게 잇는다.
const SKY_COLOR = '#FEFAF1';

export function SignupHero() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const height = width * HERO_ASPECT_RATIO;

  // 상태바와 사진이 겹치지 않도록 상단 inset만큼 내리고, 그 영역은 하늘색으로 채운다.
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SvgXml
        xml={heroXml}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SKY_COLOR,
  },
});
