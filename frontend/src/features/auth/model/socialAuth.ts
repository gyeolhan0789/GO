import { GOOGLE_WEB_CLIENT_ID } from '@env';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  getProfile as getKakaoProfile,
  login as kakaoLogin,
} from '@react-native-seoul/kakao-login';

import type { SocialProvider } from '../constants/socialProviders';

/**
 * 소셜 로그인 SDK가 돌려준 계정. 백엔드는 `idToken`만 검증해서 이메일·닉네임을
 * 직접 꺼내가므로, 앱이 서버로 보내는 값은 `idToken`뿐이다.
 */
export type SocialAccount = {
  provider: SocialProvider;
  idToken: string;
  /** 소셜 계정에 등록된 이름. 가입 화면의 닉네임 기본값으로만 쓴다. */
  name: string | null;
};

/** 사용자가 로그인 창을 그냥 닫은 경우. 에러 문구를 띄우지 않으려고 따로 구분한다. */
export class SocialAuthCancelledError extends Error {
  constructor() {
    super('소셜 로그인이 취소되었습니다.');
    this.name = 'SocialAuthCancelledError';
  }
}

let isGoogleConfigured = false;

function configureGoogle() {
  if (isGoogleConfigured) {
    return;
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'GOOGLE_WEB_CLIENT_ID가 없습니다. .env에 웹 클라이언트 ID를 넣어주세요.',
    );
  }

  // iOS는 별도의 iosClientId와 Info.plist URL 스킴이 필요하다. 아직 콘솔에
  // iOS 앱을 등록하지 않아 Android만 동작한다.
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  isGoogleConfigured = true;
}

async function signInWithGoogle(): Promise<SocialAccount> {
  configureGoogle();

  // Play 서비스가 없거나 업데이트가 필요한 기기면 여기서 먼저 걸러진다.
  await GoogleSignin.hasPlayServices();

  // SDK는 한 번 고른 계정을 캐시해서 다음 signIn()부터 계정 선택 창을 건너뛴다.
  // 로그인 화면에서는 기기에 있는 다른 계정도 고를 수 있어야 하므로 먼저 비운다
  // (계정 연결 자체를 끊는 revokeAccess와 달리 이 기기의 선택만 지운다).
  await GoogleSignin.signOut().catch(() => {});

  let response;
  try {
    response = await GoogleSignin.signIn();
  } catch (error) {
    // 취소는 보통 cancelled 응답으로 오지만, 진행 중 재요청처럼 예외로 오는
    // 경로도 있어 코드로도 한 번 더 확인한다.
    if (
      isErrorWithCode(error) &&
      error.code === statusCodes.SIGN_IN_CANCELLED
    ) {
      throw new SocialAuthCancelledError();
    }
    throw error;
  }

  if (isCancelledResponse(response)) {
    throw new SocialAuthCancelledError();
  }

  const { idToken, user } = response.data;
  if (idToken === null) {
    throw new Error('Google 계정에서 ID 토큰을 받지 못했습니다.');
  }

  return { provider: 'GOOGLE', idToken, name: user.name };
}

/** 카카오 SDK는 취소도 일반 에러로 던지고 코드를 구분해주지 않아 메시지로 가른다. */
function isKakaoCancellation(error: unknown) {
  return (
    error instanceof Error && /cancel/i.test(`${error.message} ${error.name}`)
  );
}

async function signInWithKakao(): Promise<SocialAccount> {
  let idToken: string;
  try {
    // idToken은 카카오 콘솔에서 OpenID Connect를 켠 앱만 내려준다.
    ({ idToken } = await kakaoLogin());
  } catch (error) {
    if (isKakaoCancellation(error)) {
      throw new SocialAuthCancelledError();
    }
    throw error;
  }

  if (!idToken) {
    throw new Error('카카오 계정에서 ID 토큰을 받지 못했습니다.');
  }

  // 서버는 idToken만 검증하므로, 프로필은 닉네임 기본값을 얻으려고만 부른다.
  const profile = await getKakaoProfile();

  return {
    provider: 'KAKAO',
    idToken,
    name: profile.nickname || profile.name || null,
  };
}

/**
 * 제공자의 로그인 창을 띄우고 계정 정보를 받아온다. 사용자가 창을 닫으면
 * `SocialAuthCancelledError`를 던진다.
 */
export function signInWithSocialProvider(
  provider: SocialProvider,
): Promise<SocialAccount> {
  return provider === 'GOOGLE' ? signInWithGoogle() : signInWithKakao();
}
