import { StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import type { CharacterLayer } from '../model/character';
import { CharacterLayers } from './CharacterLayers';
import { CharacterScene } from './CharacterScene';

type CharacterPreviewProps = {
  baseImage: ImageSourcePropType | null;
  /** 아래에 깔릴 것부터 정렬된 착용 아이템(`selectLayerItems` 결과). */
  items: CharacterLayer[];
  style?: StyleProp<ViewStyle>;
};

/** 산책길 배경 위에 캐릭터를 세운다. 겹쳐 그리기는 `CharacterLayers`가 맡는다. */
export function CharacterPreview({
  baseImage,
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
      <CharacterScene />

      <CharacterLayers
        baseImage={baseImage}
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
    height: '88%',
    aspectRatio: 1,
    marginBottom: '2%',
  },
});
