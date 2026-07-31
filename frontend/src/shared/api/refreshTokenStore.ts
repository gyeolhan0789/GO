import * as Keychain from 'react-native-keychain';

/**
 * 리프레시 토큰 보관소.
 *
 * 액세스 토큰과 달리 앱을 재시작해도 남아 있어야 하므로 디스크에 저장하는데,
 * 14일짜리 자격 증명이라 평문(AsyncStorage)은 쓸 수 없다. Android는 Keystore가
 * 쥔 키로 암호화한 뒤 암호문만, iOS는 Keychain에 저장한다.
 *
 * 라이브러리 교체 가능성이 있어(New Architecture 호환 등) 이 모듈 하나로
 * 격리한다. 바깥에서는 `react-native-keychain`을 직접 부르지 않는다.
 */

// Keychain은 username/password 쌍만 저장할 수 있어, 토큰은 password 자리에
// 넣고 username에는 식별용 고정값을 둔다.
const ACCOUNT = 'refreshToken';

// 다른 항목과 섞이지 않도록 이 토큰 전용 네임스페이스를 준다.
const SERVICE_OPTIONS: Keychain.BaseOptions = {
  service: 'com.wecandoit.auth.refresh',
};

const SET_OPTIONS: Keychain.SetOptions = {
  ...SERVICE_OPTIONS,
  // 부팅 직후 백그라운드에서 세션을 복구할 수 있어야 하므로 기기가 잠겨 있어도
  // 읽히는 AFTER_FIRST_UNLOCK을 쓴다(iOS 전용 옵션, Android는 무시). WHEN_UNLOCKED
  // 이면 잠금 상태에서 실패한다. 생체 인증(accessControl)은 일부러 걸지 않는다 —
  // 걸면 앱을 켤 때마다 지문 프롬프트가 떠서 조용한 세션 복구가 불가능해진다.
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
};

/**
 * 리프레시 토큰을 저장한다. 기존 값이 있으면 덮어쓴다.
 *
 * 실패를 삼키지 않고 그대로 던진다. 재발급으로 회전된 토큰을 저장하지 못하면
 * 기기에 폐기된 구토큰이 남아, 다음 실행에서 서버의 재사용 탐지에 걸려 세션이
 * 통째로 날아간다. 호출부가 알고 대응해야 하는 실패다.
 */
export async function saveRefreshToken(token: string): Promise<void> {
  await Keychain.setGenericPassword(ACCOUNT, token, SET_OPTIONS);
}

/**
 * 저장된 리프레시 토큰을 읽는다. 없으면 `null`.
 *
 * 읽기 실패는 "토큰 없음"과 같게 다룬다. 어느 쪽이든 세션을 이어갈 수 없어
 * 로그인 화면으로 보내야 하고, 저장소가 깨진 상태에서 앱이 멈추면 사용자가
 * 복구할 방법이 없다.
 */
export async function readRefreshToken(): Promise<string | null> {
  try {
    // 저장된 값이 없으면 false를 반환한다(null이 아니다).
    const stored = await Keychain.getGenericPassword(SERVICE_OPTIONS);

    if (stored === false || stored.password.length === 0) {
      return null;
    }

    return stored.password;
  } catch {
    return null;
  }
}

/**
 * 저장된 리프레시 토큰을 지운다.
 *
 * 쿠키는 만료되면 저장소가 알아서 지웠지만 Keychain에는 만료 개념이 없어,
 * 재발급 실패나 로그아웃 시 직접 지워야 한다. 안 지우면 죽은 토큰으로 매번
 * 실패하는 재발급을 시도한다.
 */
export async function clearRefreshToken(): Promise<void> {
  try {
    await Keychain.resetGenericPassword(SERVICE_OPTIONS);
  } catch {
    // 지우지 못해도 이어서 로그인 화면으로 보내는 편이 낫다. 남은 토큰은 다음
    // 재발급 시도에서 실패하며 다시 정리된다.
  }
}
