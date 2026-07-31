import AsyncStorage from '@react-native-async-storage/async-storage';

import { GENDERS } from '../constants/genders';
import type { Gender } from '../constants/genders';
import type { SocialProvider } from '../constants/socialProviders';

const KEY_PREFIX = 'social.setup.';

function storageKey(provider: SocialProvider, accountId: string) {
  return `${KEY_PREFIX}${provider}.${accountId}`;
}

function parseGender(value: string | null): Gender | null {
  return GENDERS.find(gender => gender.value === value)?.value ?? null;
}

/**
 * 이 기기에서 해당 소셜 계정의 가입 절차(닉네임·성별 입력)를 끝냈는지 읽는다.
 * 끝냈다면 그때 고른 성별을 돌려준다.
 *
 * 소셜 로그인 API는 신규/기존 회원을 구분해주지 않고 응답이 토큰뿐이라, 앱이
 * "이 계정은 이미 가입을 마쳤다"를 스스로 기억해야 한다. 그래서 기기에 남기는
 * 기록이고, 앱을 지우거나 기기를 바꾸면 기존 회원도 입력 화면을 한 번 더 본다
 * (입력값은 프로필 수정으로 반영되므로 계정이 중복 생성되지는 않는다).
 *
 * 성별을 함께 보관하는 이유: 소셜 로그인 요청이 성별을 필수로 받는다. 서버는
 * 기존 회원이면 이 값을 무시하지만, 보낼 값 자체는 있어야 한다.
 */
export async function getCompletedSocialSetup(
  provider: SocialProvider,
  accountId: string,
): Promise<Gender | null> {
  try {
    return parseGender(await AsyncStorage.getItem(storageKey(provider, accountId)));
  } catch {
    // 읽기 실패는 "기록 없음"과 같게 다룬다. 입력 화면을 한 번 더 보여줄 뿐이다.
    return null;
  }
}

/** 가입 절차를 끝냈다고 기록한다. */
export async function saveCompletedSocialSetup(
  provider: SocialProvider,
  accountId: string,
  gender: Gender,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(provider, accountId), gender);
}
