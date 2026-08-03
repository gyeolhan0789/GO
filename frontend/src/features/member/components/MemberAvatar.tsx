import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import type { Gender } from '../../auth/constants/genders';
import type { EquippedItem } from '../api/memberApi';
import { DEFAULT_CHARACTER_IMAGE_BY_GENDER } from '../constants/characterImages';
import { toCharacterItem, toImageSource } from '../model/character';
import {
  selectLayerItems,
  toEquippedByCategory,
} from '../model/equippedItems';
import { CharacterBust } from './CharacterBust';
import { CharacterLayers } from './CharacterLayers';

type MemberAvatarProps = {
  /**
   * 응답에 성별이 없는 곳(친구 목록 등)은 생략한다. 그때 기본 이미지도 없으면
   * 사람 아이콘 위에 착용 아이템만 겹친다.
   */
  gender?: Gender;
  /** 서버가 아직 안 올린 배포에서는 비어 있다. 그때는 성별 에셋으로 그린다. */
  defaultImageUrl?: string | null;
  equippedItems: EquippedItem[] | undefined;
  /** 크기와 배경은 쓰는 쪽이 정한다(랭킹 줄 44, 시상대 66, 친구 카드 48). */
  style?: StyleProp<ViewStyle>;
  /**
   * 작은 원형 자리는 흉상으로 자른다. 시상대는 단 위에 서 있는 모습이라 전신을
   * 그대로 두어야 자연스럽다.
   */
  variant?: 'bust' | 'full';
};

/**
 * 다른 회원의 아바타. 기본 캐릭터 위에 착용 아이템을 겹쳐 그린다.
 * 랭킹·동행·기록이 함께 쓴다.
 *
 * 겹치는 순서는 옷 입히기 화면과 같은 `selectLayerItems`를 쓴다. 순서가 갈리면
 * 같은 조합이 화면마다 다르게 보인다.
 */
export function MemberAvatar({
  gender,
  defaultImageUrl,
  equippedItems,
  style,
  variant = 'bust',
}: MemberAvatarProps) {
  const layers = useMemo(
    () =>
      selectLayerItems(
        toEquippedByCategory((equippedItems ?? []).map(toCharacterItem)),
      ),
    [equippedItems],
  );
  const fallbackImage = gender
    ? DEFAULT_CHARACTER_IMAGE_BY_GENDER[gender]
    : null;
  const baseImage = toImageSource(defaultImageUrl ?? null) ?? fallbackImage;

  if (variant === 'full') {
    return (
      <CharacterLayers
        baseImage={baseImage}
        fallbackImage={fallbackImage}
        items={layers}
        style={[styles.full, style]}
      />
    );
  }

  return (
    <CharacterBust
      baseImage={baseImage}
      fallbackImage={fallbackImage}
      items={layers}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  // 레이어가 절대 배치라 상자에 넘치는 부분을 잘라야 모양이 유지된다.
  full: {
    overflow: 'hidden',
  },
});
