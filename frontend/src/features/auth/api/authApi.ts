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

/**
 * 소셜 계정 검증 결과.
 *
 * - `LOGIN`: 이미 가입된 계정이다. 토큰이 채워져 오고 `signupToken`은 비어 있다.
 * - `SIGNUP_REQUIRED`: 아직 가입되지 않았다. 회원은 만들어지지 않았고 `signupToken`만
 *   내려온다. 이 토큰으로 가입을 마쳐야 한다.
 */
export type SocialVerifyResponse = {
  status: 'LOGIN' | 'SIGNUP_REQUIRED';
  accessToken: string | null;
  refreshToken: string | null;
  signupToken: string | null;
};

export type SocialSignupRequest = {
  /**
   * 검증 단계에서 받은 1회용 토큰. 서버(Redis)에 이메일·닉네임과 함께 **5분**만
   * 보관되므로, 입력 화면에서 오래 머물면 만료돼 다시 로그인해야 한다.
   */
  signupToken: string;
  gender: Gender;
};

const SOCIAL_PATHS: Record<SocialProvider, string> = {
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
 * 소셜 계정을 검증한다. 가입된 계정이면 바로 토큰을, 아니면 가입용 토큰을 준다.
 * 신규 여부 판정은 서버가 하므로 앱이 따로 기억할 게 없다.
 */
export function verifySocialAccount(
  provider: SocialProvider,
  body: { idToken: string },
) {
  return apiClient.post<SocialVerifyResponse>(SOCIAL_PATHS[provider], body);
}

/** 닉네임·지역은 받지 않는다. 서버가 소셜 계정 이름으로 채우므로 가입 후 따로 고쳐야 한다. */
export function completeSocialSignup(
  provider: SocialProvider,
  body: SocialSignupRequest,
) {
  return apiClient.post<LoginResponse>(
    `${SOCIAL_PATHS[provider]}/signup`,
    body,
  );
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
