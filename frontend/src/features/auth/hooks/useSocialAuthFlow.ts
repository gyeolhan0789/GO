import { useCallback, useState } from 'react';

import { ApiError } from '../../../shared/api/ApiError';
import type { SocialProvider } from '../constants/socialProviders';
import {
  SocialAuthCancelledError,
  signInWithSocialProvider,
} from '../model/socialAuth';
import { useSocialLoginMutation } from './useSocialLoginMutation';

const FALLBACK_ERROR_MESSAGE =
  '소셜 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.';

function resolveErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  // SDK 단계의 실패(예: DEVELOPER_ERROR)는 원문이 원인 파악에 훨씬 도움이 된다.
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return FALLBACK_ERROR_MESSAGE;
}

export type SocialSignupHandoff = {
  provider: SocialProvider;
  /** 가입 API에 그대로 실어 보낼 1회용 토큰. 5분 뒤 만료된다. */
  signupToken: string;
  /** 닉네임 입력의 기본값으로 쓸 소셜 계정 이름. */
  suggestedName: string | null;
};

/**
 * 소셜 버튼을 눌렀을 때의 흐름을 담는다. 제공자 로그인 창을 띄우고 서버에
 * 계정을 검증한다. 가입된 계정이면 바로 로그인되고, 아니면 서버가 준
 * `signupToken`을 `onSignupRequired`로 넘겨 프로필 입력을 요청한다.
 */
export function useSocialAuthFlow(
  onSignupRequired: (handoff: SocialSignupHandoff) => void,
) {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutateAsync: login } = useSocialLoginMutation();

  const start = useCallback(
    async (provider: SocialProvider) => {
      setErrorMessage(null);
      setPendingProvider(provider);

      try {
        const account = await signInWithSocialProvider(provider);
        const verified = await login({
          provider: account.provider,
          idToken: account.idToken,
        });

        // 가입된 계정이면 위 mutation이 이미 세션을 시작했다.
        if (verified.status === 'SIGNUP_REQUIRED' && verified.signupToken) {
          onSignupRequired({
            provider: account.provider,
            signupToken: verified.signupToken,
            suggestedName: account.name,
          });
        }
      } catch (error) {
        // 사용자가 로그인 창을 닫은 것은 실패가 아니므로 조용히 지나간다.
        if (!(error instanceof SocialAuthCancelledError)) {
          setErrorMessage(resolveErrorMessage(error));
        }
      } finally {
        setPendingProvider(null);
      }
    },
    [login, onSignupRequired],
  );

  return { start, pendingProvider, errorMessage };
}
