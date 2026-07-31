import { apiClient } from '../../../shared/api/client';
import type { Gender } from '../constants/genders';
import type { Region } from '../constants/regions';
import type { SocialProvider } from '../constants/socialProviders';

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

export type SocialLoginRequest = {
  /** 제공자 SDK가 발급한 OIDC ID 토큰. 서버가 서명을 검증하고 이메일을 꺼낸다. */
  idToken: string;
  /**
   * 서버가 **가입되지 않은 계정을 새로 만들 때만** 쓰는 값이다. 이미 가입된
   * 계정이면 무시되지만 요청에서는 필수라 항상 실어 보낸다.
   */
  gender: Gender;
};

const SOCIAL_LOGIN_PATHS: Record<SocialProvider, string> = {
  GOOGLE: '/auth/oauth/google',
  KAKAO: '/auth/oauth/kakao',
};

export function login(body: LoginRequest) {
  return apiClient.post<LoginResponse>('/auth/login', body);
}

// 회원가입 응답에는 토큰이 없다. 가입 후 별도로 로그인해야 한다.
export function signup(body: SignupRequest) {
  return apiClient.post<SignupResponse>('/auth/signup', body);
}

/**
 * 소셜 계정으로 로그인한다. 가입되지 않은 계정이면 서버가 이 요청에서 회원을
 * 만들고 바로 토큰을 내려주므로, 응답만으로는 신규인지 기존인지 알 수 없다.
 * 신규 여부는 `socialSetupStorage`의 기기 기록으로 판단한다.
 */
export function socialLogin(
  provider: SocialProvider,
  body: SocialLoginRequest,
) {
  return apiClient.post<LoginResponse>(SOCIAL_LOGIN_PATHS[provider], body);
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
