import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { CharacterLayers } from '../../../features/member/components/CharacterLayers';
import type { CharacterLayer } from '../../../features/member/model/character';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';

// 배경 이미지 원본 비율(716 x 426).
const STAGE_ASPECT_RATIO = 716 / 426;

const STAGE_BACKGROUND = require('../assets/ShopStage.png');

type CharacterStageProps = {
  baseImage: ImageSourcePropType | null;
  /** 서버 이미지가 로드에 실패할 때 대신 그릴 번들 에셋. */
  fallbackImage?: ImageSourcePropType | null;
  /** 아래에 깔릴 것부터 정렬된 착용 아이템(`selectLayerItems` 결과). */
  items: CharacterLayer[];
};

/** 상점 단상 위에 내 캐릭터를 세운다. 입어보는 아이템도 여기서 겹쳐 보인다. */
export function CharacterStage({
  baseImage,
  fallbackImage,
  items,
}: CharacterStageProps) {
  return (
    <View
      style={styles.stage}
      accessible
      accessibilityRole="image"
      accessibilityLabel="캐릭터 미리보기"
    >
      <Image
        source={STAGE_BACKGROUND}
        style={styles.background}
        resizeMode="contain"
      />

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
    marginHorizontal: -spacing.md,
    aspectRatio: STAGE_ASPECT_RATIO,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    // 이미지 로딩 전/실패 시에도 스테이지 자리가 비어 보이지 않게 한다.
    backgroundColor: colors.successBg,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  characterBox: {
    // 캐릭터 에셋은 정사각 캔버스의 약 81% 지점에 발끝이 있다. 그 발끝이 배경
    // 단상의 윗면에 닿도록 상자 높이와 띄울 높이를 잡았다.
    height: '68%',
    aspectRatio: 1,
    // margin이 아니라 bottom인 이유: 퍼센트 margin은 부모의 너비 기준으로 풀려서
    // (스테이지 비율이 1.68:1이라) 의도보다 훨씬 크게 먹는다. 퍼센트 top/bottom은
    // 부모 높이 기준이라 위 주석의 계산과 단위가 맞는다.
    bottom: '13%',
  },
});
