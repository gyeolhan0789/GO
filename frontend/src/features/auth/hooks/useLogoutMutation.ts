import { useMutation } from '@tanstack/react-query';

import { readRefreshToken } from '../../../shared/api/refreshTokenStore';
import { logout } from '../api/authApi';
import { useAuth } from '../model/AuthContext';

async function requestLogout() {
  const refreshToken = await readRefreshToken();

  // 서버가 빈 리프레시 토큰을 400으로 거절하므로, 보낼 게 없으면 요청 자체를
  // 만들지 않는다(`refreshAccessToken`과 같은 판단). 지울 세션은 어차피 아래
  // `onSettled`가 정리한다.
  if (refreshToken === null) {
    return;
  }

  await logout({ refreshToken });
}

/**
 * 로그아웃.
 *
 * 서버 응답이 무엇이든 이 기기의 세션은 반드시 끝낸다. 로그아웃이 실패하는
 * 경우(Authorization 헤더 누락, 토큰 형식 오류, 토큰 만료)는 모두 액세스 토큰이
 * 이미 못 쓰는 상태라는 뜻이라, 실패를 이유로 로그인 상태를 붙잡아 두면 사용자가
 * 아무것도 안 되는 세션에 갇힌다. 에러는 막는 데 쓰지 않고 화면에 알리는 데만
 * 쓴다 — 호출부가 `mutate`의 `onError`로 받는다.
 */
export function useLogoutMutation() {
  const { signOut } = useAuth();

  return useMutation({
    mutationFn: requestLogout,
    // onSuccess/onError보다 늦게 돌기 때문에, 화면이 에러를 먼저 받아 알린 뒤에
    // 세션이 정리된다(정리하면 화면이 로그인으로 교체되어 사라진다).
    onSettled: signOut,
  });
}
