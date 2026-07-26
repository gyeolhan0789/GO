import { apiClient } from '../../../shared/api/client';
import type { Region } from '../constants/regions';

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
};

export type SignupRequest = LoginRequest & {
  nickname: string;
  region: Region;
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
