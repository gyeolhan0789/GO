import { apiClient } from '../../../shared/api/client';
import type { Gender } from '../constants/genders';
import type { Region } from '../constants/regions';

export type LoginRequest = {
  email: string;
  password: string;
};

// 리프레시 토큰도 바디로 내려온다. 앱이 직접 Keychain에 보관하고 재발급·로그아웃
// 때 실어 보낸다. `refreshTokenStore` 참고.
export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

export type SignupRequest = LoginRequest & {
  nickname: string;
  region: Region;
  gender: Gender;
};

export type SignupResponse = {
  id: number;
  email: string;
  nickname: string;
};

export type LogoutRequest = {
  refreshToken: string;
};

export function login(body: LoginRequest) {
  return apiClient.post<LoginResponse>('/auth/login', body);
}

// 회원가입 응답에는 토큰이 없다. 가입 후 별도로 로그인해야 한다.
export function signup(body: SignupRequest) {
  return apiClient.post<SignupResponse>('/auth/signup', body);
}

/**
 * 로그아웃. 서버는 액세스 토큰을 블랙리스트에 올리고 저장된 리프레시 토큰을
 * 지운다. 액세스 토큰은 `Authorization: Bearer {accessToken}` 헤더로(client가
 * 붙인다), 리프레시 토큰은 바디로 보낸다. 성공(204) 응답에는 본문이 없다.
 *
 * 401 재발급 재시도는 끈다. 두 가지 이유가 있다.
 * - 재발급은 리프레시 토큰을 회전시키므로, 재시도가 바디의 구토큰을 들고 나가
 *   서버의 재사용 탐지에 걸린다.
 * - 헤더 누락·토큰 형식 오류·토큰 만료 401은 조용히 감추지 말고 그대로 호출부에
 *   전달해야 한다. `useLogoutMutation` 참고.
 */
export function logout(body: LogoutRequest) {
  return apiClient.post<void>('/auth/logout', body, {
    retryOnUnauthorized: false,
  });
}
