import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

// TODO: 서버에 기본 캐릭터 이미지가 등록되면 이 폴백을 걷어낸다
// (`USE_MOCK_CHARACTER`와 같은 조건이다).
import characterFemale from '../../../features/member/assets/character-female.png';
import characterMale from '../../../features/member/assets/character-male.png';
import type { Gender } from '../../../features/auth/constants/genders';
import type { EquippedItem } from '../../../features/member/api/memberApi';
import { CharacterBust } from '../../../features/member/components/CharacterBust';
import { CharacterLayers } from '../../../features/member/components/CharacterLayers';
import {
  toCharacterItem,
  toImageSource,
} from '../../../features/member/model/character';
import {
  selectLayerItems,
  toEquippedByCategory,
} from '../../../features/member/model/equippedItems';

type RankingAvatarProps = {
  gender: Gender;
  /** 서버가 아직 안 올린 배포에서는 비어 있다. 그때는 성별 에셋으로 그린다. */
  defaultImageUrl: string | null;
  equippedItems: EquippedItem[] | undefined;
  /** 크기와 배경은 쓰는 쪽이 정한다(목록 줄 44, 시상대 66). */
  style?: StyleProp<ViewStyle>;
  /**
   * 작은 원형 자리는 흉상으로 자른다. 시상대는 단 위에 서 있는 모습이라 전신을
   * 그대로 두어야 자연스럽다.
   */
  variant?: 'bust' | 'full';
};

const FALLBACK_BASE_BY_GENDER: Record<Gender, ImageSourcePropType> = {
  MALE: characterMale,
  FEMALE: characterFemale,
};

/**
 * 랭킹에 세우는 회원 아바타. 기본 캐릭터 위에 착용 아이템을 겹쳐 그린다.
 *
 * 겹치는 순서는 옷 입히기 화면과 같은 `selectLayerItems`를 쓴다. 순서가 갈리면
 * 같은 조합이 화면마다 다르게 보인다.
 */
export function RankingAvatar({
  gender,
  defaultImageUrl,
  equippedItems,
  style,
  variant = 'bust',
}: RankingAvatarProps) {
  const layers = useMemo(
    () =>
      selectLayerItems(
        toEquippedByCategory((equippedItems ?? []).map(toCharacterItem)),
      ),
    [equippedItems],
  );
  const baseImage =
    toImageSource(defaultImageUrl) ?? FALLBACK_BASE_BY_GENDER[gender];

  if (variant === 'full') {
    return (
      <CharacterLayers
        baseImage={baseImage}
        items={layers}
        style={[styles.full, style]}
      />
    );
  }

  return <CharacterBust baseImage={baseImage} items={layers} style={style} />;
}

const styles = StyleSheet.create({
  // 레이어가 절대 배치라 상자에 넘치는 부분을 잘라야 모양이 유지된다.
  full: {
    overflow: 'hidden',
  },
});
