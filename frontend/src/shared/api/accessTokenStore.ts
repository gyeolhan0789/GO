// 액세스 토큰은 메모리에만 보관하므로 앱을 재시작하면 사라진다. 재시작 후에는
// Keychain(iOS) / Keystore 암호화 저장소(Android)에 남아 있는 refreshToken으로
// 다시 발급받는다. `refreshTokenStore`와 `refreshAccessToken` 참고.
let accessToken: string | null = null;

const listeners = new Set<() => void>();

export function setAccessToken(token: string | null) {
  if (accessToken === token) {
    return;
  }

  accessToken = token;
  listeners.forEach(listener => listener());
}

export function getAccessToken() {
  return accessToken;
}

/**
 * 토큰이 바뀔 때(로그인/재발급/만료) 알림을 받는다. 반환값은 구독 해지 함수.
 *
 * 로그인 화면뿐 아니라 `client`의 401 재발급 경로도 토큰을 쓰기 때문에, 화면이
 * 토큰 상태를 따라오려면 이 저장소를 구독해야 한다. AuthProvider가
 * `useSyncExternalStore`로 구독한다.
 */
export function subscribeAccessToken(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
