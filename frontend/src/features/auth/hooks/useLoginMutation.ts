import { useMutation } from '@tanstack/react-query';

import { setHasLoggedInBefore } from '../../../shared/lib/loginHistoryStorage';
import { login } from '../api/authApi';
import type { LoginRequest } from '../api/authApi';
import { useAuth } from '../model/AuthContext';

export function useLoginMutation() {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: (variables: LoginRequest) => login(variables),
    onSuccess: async response => {
      await signIn(response.accessToken, response.refreshToken);
      // 다음 방문 때 "다시 만나서 반가워요!"로 맞이하기 위한 이력 기록.
      // 인사 문구용이라 저장 실패는 조용히 무시한다.
      setHasLoggedInBefore().catch(() => {});
    },
  });
}
