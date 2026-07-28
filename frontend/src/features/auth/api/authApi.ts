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

export function login(body: LoginRequest) {
  return apiClient.post<LoginResponse>('/auth/login', body);
}

// 회원가입 응답에는 토큰이 없다. 가입 후 별도로 로그인해야 한다.
export function signup(body: SignupRequest) {
  return apiClient.post<SignupResponse>('/auth/signup', body);
}
