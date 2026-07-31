import { useMutation } from '@tanstack/react-query';

import { updateMyProfile } from '../../member/api/memberApi';
import { setHasLoggedInBefore } from '../../../shared/lib/loginHistoryStorage';
import { socialLogin } from '../api/authApi';
import type { Gender } from '../constants/genders';
import type { SocialProvider } from '../constants/socialProviders';
import { useAuth } from '../model/AuthContext';
import { saveCompletedSocialSetup } from '../model/socialSetupStorage';

type SocialSignupVariables = {
  provider: SocialProvider;
  accountId: string;
  idToken: string;
  nickname: string;
  gender: Gender;
};

/**
 * 소셜 계정으로 처음 로그인하는 회원의 가입. 사용자가 고른 닉네임·성별을 반영한
 * 뒤에야 세션을 시작한다.
 *
 * 두 번 호출하는 이유: 소셜 로그인 API가 회원 생성까지 함께 처리하는데 닉네임은
 * 받지 않고 소셜 계정 이름으로 채운다. 그래서 로그인으로 회원을 만든 다음
 * 프로필 수정으로 닉네임을 덮어쓴다. 성별은 회원 생성 때 이미 반영된다.
 */
export function useSocialSignupMutation() {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: async ({
      provider,
      idToken,
      nickname,
      gender,
    }: SocialSignupVariables) => {
      const tokens = await socialLogin(provider, { idToken, gender });

      // 아직 세션을 시작하지 않아 저장된 토큰이 없다. 방금 받은 토큰으로 보낸다.
      await updateMyProfile(
        { nickname, gender },
        { accessToken: tokens.accessToken },
      );

      return tokens;
    },
    onSuccess: async (tokens, { provider, accountId, gender }) => {
      // 다음 로그인부터 입력 화면을 건너뛰기 위한 기기 기록. 저장에 실패해도
      // 로그인은 성립시킨다(다음에 한 번 더 물어볼 뿐이다).
      await saveCompletedSocialSetup(provider, accountId, gender).catch(
        () => {},
      );

      await signIn(tokens.accessToken, tokens.refreshToken);
      setHasLoggedInBefore().catch(() => {});
    },
  });
}
