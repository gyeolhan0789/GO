import { useMutation } from '@tanstack/react-query';

import { setHasLoggedInBefore } from '../../../shared/lib/loginHistoryStorage';
import { socialLogin } from '../api/authApi';
import type { Gender } from '../constants/genders';
import type { SocialProvider } from '../constants/socialProviders';
import { useAuth } from '../model/AuthContext';

type SocialLoginVariables = {
  provider: SocialProvider;
  idToken: string;
  /** 이 기기에 기록된 성별. 이미 가입된 계정이라 서버는 무시한다. */
  gender: Gender;
};

/**
 * 이미 가입을 마친 소셜 계정의 로그인. 토큰을 저장하면 RootNavigator가 알아서
 * Main으로 넘어가므로 화면 전환을 직접 하지 않는다.
 */
export function useSocialLoginMutation() {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: ({ provider, idToken, gender }: SocialLoginVariables) =>
      socialLogin(provider, { idToken, gender }),
    onSuccess: async response => {
      await signIn(response.accessToken, response.refreshToken);
      setHasLoggedInBefore().catch(() => {});
    },
  });
}
