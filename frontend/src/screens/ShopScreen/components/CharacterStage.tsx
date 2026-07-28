import { Image, StyleSheet, View } from 'react-native';

import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';

// 배경 이미지 원본 비율(716 x 426).
const STAGE_ASPECT_RATIO = 716 / 426;

const STAGE_BACKGROUND = require('../assets/ShopStage.png');

export function CharacterStage() {
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
      {/* TODO: 백엔드가 내려주는 캐릭터 이미지를 단상 위에 올린다. */}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    marginHorizontal: -spacing.md,
    aspectRatio: STAGE_ASPECT_RATIO,
    overflow: 'hidden',
    // 이미지 로딩 전/실패 시에도 스테이지 자리가 비어 보이지 않게 한다.
    backgroundColor: colors.successBg,
  },
  background: {
    width: '100%',
    height: '100%',
  },
});
