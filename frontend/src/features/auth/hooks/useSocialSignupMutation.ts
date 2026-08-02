import { useMutation } from '@tanstack/react-query';

import { updateMyProfile } from '../../member/api/memberApi';
import { setHasLoggedInBefore } from '../../../shared/lib/loginHistoryStorage';
import { completeSocialSignup } from '../api/authApi';
import type { Gender } from '../constants/genders';
import type { Region } from '../constants/regions';
import type { SocialProvider } from '../constants/socialProviders';
import { useAuth } from '../model/AuthContext';

type SocialSignupVariables = {
  provider: SocialProvider;
  signupToken: string;
  nickname: string;
  region: Region;
  gender: Gender;
};

/**
 * 소셜 가입을 마치고 세션을 시작한다.
 *
 * 가입 API는 성별만 받는다. 닉네임은 소셜 계정 이름으로 채워지고 지역은 아예
 * 비어 있으므로, 사용자가 고른 값으로 한 번 고쳐준 다음에야 세션을 시작한다.
 * 아직 저장된 토큰이 없어서 프로필 수정에는 방금 받은 액세스 토큰을 직접 싣는다.
 */
export function useSocialSignupMutation() {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: async ({
      provider,
      signupToken,
      nickname,
      region,
      gender,
    }: SocialSignupVariables) => {
      const tokens = await completeSocialSignup(provider, {
        signupToken,
        gender,
      });

      await updateMyProfile(
        { nickname, region },
        { accessToken: tokens.accessToken },
      );

      return tokens;
    },
    onSuccess: async tokens => {
      await signIn(tokens.accessToken, tokens.refreshToken);
      setHasLoggedInBefore().catch(() => {});
    },
  });
}
