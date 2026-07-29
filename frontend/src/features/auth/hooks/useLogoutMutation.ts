import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError, UNAUTHORIZED_STATUS } from '../../../shared/api/ApiError';
import { isDeviceQuery } from '../../../shared/api/deviceQueries';
import { refreshAccessToken } from '../../../shared/api/refreshAccessToken';
import { readRefreshToken } from '../../../shared/api/refreshTokenStore';
import { logout } from '../api/authApi';
import { useAuth } from '../model/AuthContext';

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === UNAUTHORIZED_STATUS;
}

async function requestLogout() {
  const refreshToken = await readRefreshToken();

  // 서버가 빈 리프레시 토큰을 400으로 거절하므로 요청 자체를 만들지 않는다.
  if (refreshToken === null) {
    return;
  }

  try {
    await logout({ refreshToken });
    return;
  } catch (error) {
    if (!isUnauthorized(error) || !(await refreshAccessToken())) {
      throw error;
    }

    // 재발급이 리프레시 토큰을 회전시켰으므로 위 refreshToken은 이미 폐기된 값이다.
    // 이 재읽기 때문에 재시도를 client에 맡기지 못한다(`authApi.logout` 참고).
    const rotatedRefreshToken = await readRefreshToken();

    if (rotatedRefreshToken === null) {
      throw error;
    }

    await logout({ refreshToken: rotatedRefreshToken });
  }
}

/**
 * 로그아웃. 서버 응답이 무엇이든 이 기기의 세션은 끝낸다 — 실패 케이스는 모두
 * 액세스 토큰이 이미 못 쓰는 상태라는 뜻이라, 막으면 사용자가 갇힌다.
 */
export function useLogoutMutation() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestLogout,
    onSettled: async () => {
      await signOut();
      // 기기에 속한 값은 남긴다 — 지우면 진입 게이트가 미완료로 읽혀 온보딩으로 간다.
      queryClient.removeQueries({
        predicate: query => !isDeviceQuery(query.queryKey),
      });
    },
  });
}
