import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

import { percent } from '../../../shared/lib/percent';
import type { ItemCategory } from '../api/memberApi';

/**
 * 아이템 카드 썸네일. 아이템 이미지는 512 정사각 캐릭터 캔버스에 정렬된 투명
 * 오버레이라(모자는 머리 위치에만 그려진 전신 크기 PNG), 그대로 축소하면
 * 캔버스 여백에 눌려 아이템이 몇 픽셀로 보인다.
 *
 * CharacterBust와 같은 방식으로 푼다. 카테고리마다 아이템이 그려지는 세로
 * 위치를 알고 있으니, 그 부분만 확대해 창에 담는다. 캔버스에서 캐릭터는
 * 세로 15~81%를 차지한다(CharacterBust의 실측 주석 참고).
 */
/** 창에 담을 그림 위치와 확대율. 캔버스 비율(0~1) 기준. */
type AssetFrame = {
  /** 그림의 가로 중심. */
  centerX: number;
  /** 그림의 세로 중심. */
  centerY: number;
  /** 창을 캔버스의 1/zoom로 좁혀 그만큼 확대한다. */
  zoom: number;
};

/**
 * 카테고리별 창 규격. 실제 아이템 PNG(512 정사각) 14장의 알파 범위를 재서 넣었다.
 *
 * | 카테고리 | 가로 중심 | 세로 중심 | 체감 크기(√넓이) |
 * |---|---|---|---|
 * | 모자 | 0.500 | 0.303 | 0.42 |
 * | 상의 | 0.496 | 0.620 | 0.24 |
 * | 하의 | 0.494 | 0.746 | 0.16 |
 *
 * **가로 중심이 0.5가 아닌 건 에셋 문제를 상쇄하는 값이다.** 상의·하의 그림이
 * 캔버스 정중앙보다 2~4px 왼쪽에 그려져 있어서, 0.5로 자르면 카드 안에서 그림이
 * 왼쪽으로 치우쳐 보인다(확대율이 큰 하의가 3px 넘게 두드러진다). 실측값(위 표)에서
 * 시작해 화면을 보며 조금 더 민 값이 아래 상수다. 에셋이 정중앙으로 고쳐지면 세 값
 * 모두 0.5로 되돌리면 된다.
 *
 * 확대율은 체감 크기가 카테고리마다 캔버스의 0.41 정도로 맞도록 역산한 값이다.
 * 하나로 쓰면(예전 1.5배) 모자가 하의보다 두 배 넘게 커 보인다. 확대해도 창이
 * 그림보다 넓어 잘리지 않는다 — 가장 큰 아이템도 창의 63%까지만 찬다.
 *
 * 판매 아이템이 없어 못 잰 카테고리는 예전 어림값을 둔다. 아이템이 생기면 같은
 * 방법으로 재서 고쳐야 한다.
 */
const FRAME_BY_CATEGORY: Record<ItemCategory, AssetFrame> = {
  // 모자는 에셋끼리 크기 차이가 커서(챙만 있는 썬캡 대 크라운 높은 밀짚모자)
  // 하나의 창으로 전부 같은 크기로 만들 수는 없다. 가운데값을 쓴다.
  HAT: { centerX: 0.5, centerY: 0.303, zoom: 1.0 },
  TOP: { centerX: 0.487, centerY: 0.62, zoom: 1.72 },
  BOTTOM: { centerX: 0.492, centerY: 0.746, zoom: 2.4 },
  // 이하 미측정(판매 아이템 없음).
  ACCESSORY: { centerX: 0.5, centerY: 0.47, zoom: 1.5 },
};

type ItemThumbnailProps = {
  source: ImageSourcePropType;
  category: ItemCategory;
  /** 창이 될 상자. 크기는 쓰는 쪽이 정하고, 여기서는 안을 채우고 자른다. */
  style?: StyleProp<ViewStyle>;
  /** 서버 이미지 로딩 실패를 쓰는 쪽에서 자리표시로 바꿀 수 있게 열어 둔다. */
  onError?: () => void;
};

export function ItemThumbnail({
  source,
  category,
  style,
  onError,
}: ItemThumbnailProps) {
  const { centerX, centerY, zoom } = FRAME_BY_CATEGORY[category];

  return (
    <View style={[styles.frame, style]}>
      <Image
        source={source}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        onError={onError}
        style={[
          styles.image,
          {
            width: percent(zoom * 100),
            height: percent(zoom * 100),
            // 확대된 이미지에서 (centerX, centerY)가 창 중앙에 오도록 끌어온다.
            left: percent((0.5 - zoom * centerX) * 100),
            top: percent((0.5 - zoom * centerY) * 100),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    // 창 밖으로 나가는 나머지 캔버스를 잘라낸다.
    overflow: 'hidden',
  },
  image: {
    // 크기는 카테고리별 확대율에 따라 호출 시점에 정한다.
    position: 'absolute',
  },
});
