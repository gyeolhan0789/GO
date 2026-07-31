import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

import type { ItemCategory } from '../api/memberApi';

/**
 * 아이템 카드 썸네일. 아이템 이미지는 512 정사각 캐릭터 캔버스에 정렬된 투명
 * 오버레이라(모자는 머리 위치에만 그려진 전신 크기 PNG), 그대로 축소하면
 * 캔버스 여백에 눌려 아이템이 몇 픽셀로 보인다.
 *
 * CharacterBust와 같은 방식으로 푼다. 카테고리마다 아이템이 그려지는 세로
 * 위치를 알고 있으니, 그 부분만 확대해 창에 담는다. 캔버스에서 캐릭터는
 * 세로 15~81%, 가로 35~69%를 차지한다(CharacterBust의 실측 주석 참고).
 */
// 창이 캔버스의 2/3(1.5배). 이보다 키우면 챙 넓은 모자류가 창 밖으로 잘린다.
const ZOOM = 1.5;
/** 캐릭터 가로 중심. 모든 카테고리가 같다. */
const CENTER_X = 0.5175;
/** 카테고리별 아이템 세로 중심(캔버스 비율). */
const CENTER_Y_BY_CATEGORY: Record<ItemCategory, number> = {
  // 모자는 머리 위로 솟는 높이가 아이템마다 달라서 창을 캔버스 위 끝까지 올린다.
  HAT: 0.28,
  SUNGLASSES: 0.32,
  TOP: 0.47,
  ACCESSORY: 0.47,
  BOTTOM: 0.64,
  SHOES: 0.76,
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
  const centerY = CENTER_Y_BY_CATEGORY[category];

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
            // 확대된 이미지에서 (CENTER_X, centerY)가 창 중앙에 오도록 끌어온다.
            left: `${(0.5 - ZOOM * CENTER_X) * 100}%`,
            top: `${(0.5 - ZOOM * centerY) * 100}%`,
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
    position: 'absolute',
    width: `${ZOOM * 100}%`,
    height: `${ZOOM * 100}%`,
  },
});
