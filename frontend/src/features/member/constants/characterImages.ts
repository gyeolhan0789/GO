import type { ImageSourcePropType } from 'react-native';

import type { Gender } from '../../auth/constants/genders';
import characterFemale from '../assets/character-female.png';
import characterMale from '../assets/character-male.png';

/**
 * 서버에 성별 기본 캐릭터 이미지가 등록되지 않은 배포에서 쓰는 번들 폴백.
 * 이게 없으면 캐릭터 자리가 사람 아이콘으로만 남는다.
 */
export const DEFAULT_CHARACTER_IMAGE_BY_GENDER: Record<
  Gender,
  ImageSourcePropType
> = {
  MALE: characterMale,
  FEMALE: characterFemale,
};
