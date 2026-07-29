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
 * 로그아웃. 액세스 토큰은 헤더로(client가 붙인다), 리프레시 토큰은 바디로 보낸다.
 *
 * 401 재시도를 끄는 이유: client의 재시도는 헤더만 갈아끼우고 바디는 처음 것을
 * 그대로 보내므로, 재발급으로 회전된 리프레시 토큰을 반영하지 못해 서버의 재사용
 * 탐지에 걸린다. 재시도는 `useLogoutMutation`이 직접 한다.
 */
export function logout(body: LogoutRequest) {
  return apiClient.post<void>('/auth/logout', body, {
    retryOnUnauthorized: false,
  });
}
