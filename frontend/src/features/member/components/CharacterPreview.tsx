import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { colors } from '../../../shared/constants/colors';
import type { CharacterItem } from '../model/character';
import { CharacterScene } from './CharacterScene';

type CharacterPreviewProps = {
  /** 성별 기본 캐릭터 이미지. 아직 없으면 null. */
  baseImage: ImageSourcePropType | null;
  /** 아래에 깔릴 것부터 정렬된 착용 아이템(`selectLayerItems` 결과). */
  items: CharacterItem[];
  style?: StyleProp<ViewStyle>;
};

const FALLBACK_ICON_SIZE = 64;

/**
 * 배경 위에 기본 캐릭터를 세우고, 그 위에 착용 아이템을 순서대로 겹쳐 그린다.
 *
 * 아이템 이미지는 기본 캐릭터와 같은 캔버스를 쓰는 투명 배경 오버레이여야 한다
 * (모자면 머리 위치에 모자만 그려진 전신 크기 PNG). 모든 레이어를 같은 상자
 * 안에서 `contain`으로 그리므로, 캔버스 비율이 다른 이미지가 섞이면 위치가
 * 어긋난다.
 */
export function CharacterPreview({
  baseImage,
  items,
  style,
}: CharacterPreviewProps) {
  const layers = items.filter(item => item.image != null);

  return (
    <View
      style={[styles.stage, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="내 캐릭터 미리보기"
    >
      <CharacterScene />

      <View style={styles.characterBox}>
        {baseImage ? (
          <Image
            source={baseImage}
            style={styles.layer}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.fallback}>
            <Ionicons
              name="person"
              size={FALLBACK_ICON_SIZE}
              color={colors.mutedStrong}
            />
          </View>
        )}

        {layers.map(item => (
          <Image
            key={item.memberItemId}
            // 위 filter로 걸렀지만 타입에는 남는 null을 여기서 좁힌다.
            source={item.image ?? undefined}
            style={styles.layer}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    aspectRatio: 16 / 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    // 배경 SVG가 그려지기 전에도 자리가 비어 보이지 않게 한다.
    backgroundColor: colors.successBg,
  },
  characterBox: {
    // 에셋이 정사각 캔버스이고 발끝이 아래쪽 여백 위에 있어, 상자를 살짝 띄워야
    // 캐릭터가 산책길 위에 서고 미리보기 위에 얹히는 버튼과도 겹치지 않는다.
    height: '88%',
    aspectRatio: 1,
    marginBottom: '2%',
  },
  // 모든 레이어가 같은 상자를 꽉 채워야 서로 어긋나지 않는다.
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
