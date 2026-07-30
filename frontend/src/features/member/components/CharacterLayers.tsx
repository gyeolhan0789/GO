import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../shared/constants/colors';
import type { CharacterLayer } from '../model/character';

type CharacterLayersProps = {
  /** 없으면 사람 아이콘으로 대신한다. */
  baseImage: ImageSourcePropType | null;
  /** 아래에 깔릴 것부터 정렬된 착용 아이템(`selectLayerItems` 결과). */
  items: CharacterLayer[];
  /** 캐릭터가 설 상자. 배경마다 자리가 달라 바깥에서 정한다. */
  style?: StyleProp<ViewStyle>;
};

const FALLBACK_ICON_SIZE = 64;

/**
 * 기본 캐릭터 위에 착용 아이템을 순서대로 겹쳐 그린다. 배경은 쓰는 쪽이 정한다.
 *
 * 아이템 이미지는 기본 캐릭터와 같은 캔버스를 쓰는 투명 배경 오버레이여야 한다
 * (모자면 머리 위치에 모자만 그려진 전신 크기 PNG). 모든 레이어를 같은 상자
 * 안에서 `contain`으로 그리므로, 캔버스 비율이 다르면 위치가 어긋난다.
 */
export function CharacterLayers({
  baseImage,
  items,
  style,
}: CharacterLayersProps) {
  const layers = items.filter(
    (item): item is CharacterLayer & { image: ImageSourcePropType } =>
      item.image != null,
  );

  return (
    <View style={style}>
      {baseImage ? (
        <Image
          source={baseImage}
          style={styles.layer}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.layer, styles.fallback]}>
          <Ionicons
            name="person"
            size={FALLBACK_ICON_SIZE}
            color={colors.mutedStrong}
          />
        </View>
      )}

      {layers.map(item => (
        <Image
          key={item.itemId}
          source={item.image}
          style={styles.layer}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // 모든 레이어가 같은 상자를 꽉 채워야 서로 어긋나지 않는다.
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
