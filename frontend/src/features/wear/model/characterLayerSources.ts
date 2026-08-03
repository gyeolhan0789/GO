import { Image } from 'react-native';

import type { Character } from '../../member/model/character';
import { selectLayerItems, toEquippedByCategory } from '../../member/model/equippedItems';

/**
 * 캐릭터를 워치로 보낼 수 있는 형태(URI 문자열 목록)로 편다. 아래에 깔릴 것부터
 * 순서대로 — 기본 캐릭터, 그다음 CATEGORY_LAYER_ORDER 순.
 *
 * `Image.resolveAssetSource`를 거치는 이유는 레이어 출처가 두 가지이기 때문이다.
 * 서버에 올라간 아이템은 `{ uri }`지만, 목업 모드(characterMocks.ts)에서는
 * `require()`로 번들된 숫자 모듈 ID다. 둘 다 URI 문자열로 바꿔주면 네이티브가
 * 같은 방식으로 읽을 수 있다(릴리스 빌드에서 번들 에셋은 URI 대신 drawable
 * 리소스 이름이 나오는데, 그것도 네이티브가 처리한다 — CharacterComposer 참고).
 */
export function toCharacterLayerSources(character: Character): string[] {
  const layers = [
    character.baseImage,
    ...selectLayerItems(toEquippedByCategory(character.equippedItems)).map(
      item => item.image,
    ),
  ];

  return layers
    .map(layer => (layer ? Image.resolveAssetSource(layer)?.uri : null))
    .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
}
