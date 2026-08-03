import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  ImageSourcePropType,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import type { CharacterLayer } from '../model/character';
import { CharacterLayers } from './CharacterLayers';

type CharacterBustProps = {
  baseImage: ImageSourcePropType | null;
  /** 서버 이미지가 로드에 실패할 때 대신 그릴 번들 에셋. */
  fallbackImage?: ImageSourcePropType | null;
  /** 아래에 깔릴 것부터 정렬된 착용 아이템(`selectLayerItems` 결과). */
  items: CharacterLayer[];
  /**
   * 흉상이 들어갈 상자. 크기는 쓰는 쪽이 정하고, 원형 테두리 디자인(랭킹과
   * 같은 1px 회색 링)은 화면마다 어긋나지 않게 여기서 통일한다.
   */
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

/** 상자 크기 대비 대체 아이콘 비율. 원 안에서 여백이 살짝 남는 정도. */
const FALLBACK_ICON_RATIO = 0.55;

export function CharacterBust({
  baseImage,
  fallbackImage,
  items,
  style,
}: CharacterBustProps) {
  const [frameWidth, setFrameWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setFrameWidth(event.nativeEvent.layout.width);
  };

  // 그릴 기본 캐릭터가 아예 없으면(성별도 이미지도 안 내려온 응답) 흉상 확대를
  // 걸지 않는다. 확대·이동은 512 캔버스의 캐릭터 위치를 겨냥한 값이라, 가운데
  // 그려지는 대체 아이콘까지 확대하면 원 밖으로 밀려나 잘려 보인다.
  if (baseImage == null && fallbackImage == null) {
    return (
      <View style={[styles.frame, styles.iconFrame, style]} onLayout={handleLayout}>
        {frameWidth > 0 ? (
          <Ionicons
            name="person"
            size={Math.round(frameWidth * FALLBACK_ICON_RATIO)}
            color={colors.mutedStrong}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.frame, style]}>
      <CharacterLayers
        baseImage={baseImage}
        fallbackImage={fallbackImage}
        items={items}
        style={styles.bust}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    // 창 밖으로 나가는 몸통을 잘라낸다. 이게 없으면 상자를 넘어 그려진다.
    overflow: 'hidden',
    // 모든 흉상 자리가 같은 원으로 보이게 하는 공통 디자인(랭킹 목록과 동일).
    // 배경을 불투명하게 둬야 아바타를 겹쳐 쌓을 때 뒤 캐릭터가 비치지 않는다.
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.muted,
    backgroundColor: colors.surface,
  },
  iconFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bust: {
    position: 'absolute',
    width: `${BUST_ZOOM * 100}%`,
    height: `${BUST_ZOOM * 100}%`,
    left: BUST_LEFT,
    top: BUST_TOP,
  },
});
