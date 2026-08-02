import { useMutation } from '@tanstack/react-query';

import { setHasLoggedInBefore } from '../../../shared/lib/loginHistoryStorage';
import { verifySocialAccount } from '../api/authApi';
import type { SocialProvider } from '../constants/socialProviders';
import { useAuth } from '../model/AuthContext';

type SocialVerifyVariables = {
  provider: SocialProvider;
  idToken: string;
};

/**
 * 소셜 계정을 검증하고, 이미 가입된 계정이면 그대로 로그인시킨다. 토큰이 저장되면
 * RootNavigator가 Main으로 넘기므로 화면 전환을 직접 하지 않는다.
 *
 * 가입이 필요한 계정은 여기서 세션을 시작하지 않고 응답만 돌려준다. 호출부가
 * `signupToken`을 들고 프로필 입력으로 넘어간다(`useSocialAuthFlow`).
 */
export function useSocialLoginMutation() {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: ({ provider, idToken }: SocialVerifyVariables) =>
      verifySocialAccount(provider, { idToken }),
    onSuccess: async response => {
      if (
        response.status !== 'LOGIN' ||
        response.accessToken === null ||
        response.refreshToken === null
      ) {
        return;
      }

      await signIn(response.accessToken, response.refreshToken);
      setHasLoggedInBefore().catch(() => {});
    },
  });
}
