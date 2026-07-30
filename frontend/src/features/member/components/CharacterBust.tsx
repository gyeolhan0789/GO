import { StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

import type { CharacterLayer } from '../model/character';
import { CharacterLayers } from './CharacterLayers';

type CharacterBustProps = {
  baseImage: ImageSourcePropType | null;
  /** 아래에 깔릴 것부터 정렬된 착용 아이템(`selectLayerItems` 결과). */
  items: CharacterLayer[];
  /** 흉상이 들어갈 상자. 크기·모서리·배경은 쓰는 쪽이 정한다. */
  style?: StyleProp<ViewStyle>;
};

/**
 * 캐릭터의 머리와 상체만 잘라 보여준다(흉상).
 *
 * 목록 줄처럼 작은 자리에 전신을 그대로 축소하면 얼굴이 몇 픽셀로 뭉개져 누가
 * 누군지 구분되지 않는다. 모자 같은 아이템도 알아볼 수 없다.
 *
 * 기본 캐릭터·아이템은 모두 512x512 캔버스를 공유하고, 그 안에서 캐릭터는 세로
 * 78~415, 가로 178~352에 그려져 있다. 머리 위 여백부터 허리까지가 한 변의
 * 절반(256px)이라 2배로 키워 그 창만 남긴다.
 *
 * 값이 캔버스 구도에 묶여 있으니 에셋을 다시 그리면 여기도 같이 봐야 한다.
 */
const BUST_ZOOM = 2;
/** 흉상이 시작하는 지점을 창의 왼쪽 위로 끌어온다(캔버스 기준 x 0.268, y 0.137). */
const BUST_LEFT = '-53.5%';
const BUST_TOP = '-27.3%';

export function CharacterBust({ baseImage, items, style }: CharacterBustProps) {
  return (
    <View style={[styles.frame, style]}>
      <CharacterLayers baseImage={baseImage} items={items} style={styles.bust} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    // 창 밖으로 나가는 몸통을 잘라낸다. 이게 없으면 상자를 넘어 그려진다.
    overflow: 'hidden',
  },
  bust: {
    position: 'absolute',
    width: `${BUST_ZOOM * 100}%`,
    height: `${BUST_ZOOM * 100}%`,
    left: BUST_LEFT,
    top: BUST_TOP,
  },
});
