import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

// TODO: 랭킹 응답에 회원별 기본 캐릭터(성별)가 없어 번들 에셋으로 대신한다.
// 서버가 defaultImageUrl을 내려주면 이 자리채움을 걷어낸다.
import characterMale from '../../../features/member/assets/character-male.png';
import type { EquippedItem } from '../../../features/member/api/memberApi';
import { CharacterLayers } from '../../../features/member/components/CharacterLayers';
import { toCharacterItem } from '../../../features/member/model/character';
import {
  selectLayerItems,
  toEquippedByCategory,
} from '../../../features/member/model/equippedItems';

type RankingAvatarProps = {
  /** 서버가 아직 안 내려주는 배포에서도 화면이 죽지 않게 없는 경우를 받는다. */
  equippedItems: EquippedItem[] | undefined;
  /** 크기와 배경은 쓰는 쪽이 정한다(목록 줄 44, 시상대 66). */
  style?: StyleProp<ViewStyle>;
  /** 내 아바타처럼 기본 캐릭터를 아는 경우에만 넘긴다. */
  baseImage?: ImageSourcePropType | null;
};

const BASE_CHARACTER: ImageSourcePropType = characterMale;

/**
 * 랭킹에 세우는 회원 아바타. 기본 캐릭터 위에 착용 아이템을 겹쳐 그린다.
 *
 * 겹치는 순서는 옷 입히기 화면과 같은 `selectLayerItems`를 쓴다. 순서가 갈리면
 * 같은 조합이 화면마다 다르게 보인다.
 */
export function RankingAvatar({
  equippedItems,
  style,
  baseImage,
}: RankingAvatarProps) {
  const layers = useMemo(
    () =>
      selectLayerItems(
        toEquippedByCategory((equippedItems ?? []).map(toCharacterItem)),
      ),
    [equippedItems],
  );

  return (
    <CharacterLayers
      baseImage={baseImage ?? BASE_CHARACTER}
      items={layers}
      style={[styles.avatar, style]}
    />
  );
}

const styles = StyleSheet.create({
  // 레이어가 절대 배치라 상자에 넘치는 부분을 잘라야 원형이 유지된다.
  avatar: {
    overflow: 'hidden',
  },
});
