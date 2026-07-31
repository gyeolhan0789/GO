import { useCallback, useState } from 'react';

import { ApiError } from '../../../shared/api/ApiError';
import type { SocialProvider } from '../constants/socialProviders';
import {
  SocialAuthCancelledError,
  signInWithSocialProvider,
} from '../model/socialAuth';
import type { SocialAccount } from '../model/socialAuth';
import { getCompletedSocialSetup } from '../model/socialSetupStorage';
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

/**
 * 소셜 버튼을 눌렀을 때의 흐름을 담는다. 제공자 로그인 창을 띄우고, 이 기기에서
 * 가입을 마친 계정이면 바로 로그인시키고, 아니면 `onSignupRequired`로 닉네임·성별
 * 입력 화면을 요청한다.
 */
export function useSocialAuthFlow(
  onSignupRequired: (account: SocialAccount) => void,
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
        const completedGender = await getCompletedSocialSetup(
          account.provider,
          account.accountId,
        );

        if (completedGender === null) {
          onSignupRequired(account);
          return;
        }

        await login({
          provider: account.provider,
          idToken: account.idToken,
          gender: completedGender,
        });
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
