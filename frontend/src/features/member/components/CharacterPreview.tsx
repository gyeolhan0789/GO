import { StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import type { CharacterLayer } from '../model/character';
import { CharacterLayers } from './CharacterLayers';
import { CharacterScene, SCENE_WIDTH } from './CharacterScene';

type CharacterPreviewProps = {
  baseImage: ImageSourcePropType | null;
  /** 서버 이미지가 로드에 실패할 때 대신 그릴 번들 에셋. */
  fallbackImage?: ImageSourcePropType | null;
  /** 아래에 깔릴 것부터 정렬된 착용 아이템(`selectLayerItems` 결과). */
  items: CharacterLayer[];
  style?: StyleProp<ViewStyle>;
};

/**
 * 캐릭터 아트가 512 캔버스의 정중앙에서 살짝 오른쪽에 그려져 있어, 길도
 * 그만큼 밀어야 발밑 한가운데에 온다. 스크린샷 픽셀 실측으로 맞춘 값이라
 * 에셋을 다시 그리면 다시 재야 한다.
 */
const TRAIL_CENTER_X = SCENE_WIDTH / 2 + 1.6;

/** 산책길 배경 위에 캐릭터를 세운다. 겹쳐 그리기는 `CharacterLayers`가 맡는다. */
export function CharacterPreview({
  baseImage,
  fallbackImage,
  items,
  style,
}: CharacterPreviewProps) {
  return (
    <View
      style={[styles.stage, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="내 캐릭터 미리보기"
    >
      <CharacterScene trailCenterX={TRAIL_CENTER_X} />

      <CharacterLayers
        baseImage={baseImage}
        fallbackImage={fallbackImage}
        items={items}
        style={styles.characterBox}
      />
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
    // 캔버스 위쪽 여백(머리 위 ~15%)이 넉넉해 배경보다 커도 머리가 잘리지 않는다.
    height: '100%',
    aspectRatio: 1,
    marginBottom: '2%',
  },
});
