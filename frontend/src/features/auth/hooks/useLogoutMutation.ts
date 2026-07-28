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

/**
 * 로그아웃 요청. 401을 받으면 재발급한 뒤 한 번만 다시 보낸다.
 *
 * 액세스 토큰 수명이 30분이라, 앱을 켜둔 채 로그아웃하면 만료된 토큰으로 요청이
 * 나가 서버 필터에 막힌다. 이때 그냥 포기하면 로컬 세션만 정리되고 서버의
 * 리프레시 토큰은 TTL(14일)까지 남는다. 재발급으로 토큰을 갈아끼우고 다시 보내면
 * 서버도 리프레시 토큰 삭제와 액세스 토큰 블랙리스트 등록까지 마친다.
 *
 * 재시도를 `client`에 맡길 수 없는 이유: 재발급은 리프레시 토큰을 회전시키는데
 * client의 범용 재시도는 헤더만 갈아끼우고 바디는 처음 것을 그대로 보낸다. 회전된
 * 새 토큰으로 바디를 다시 만들 수 있는 건 여기뿐이다. 그래서 `logout`은
 * `retryOnUnauthorized: false`로 요청하고 재시도를 이 함수가 직접 한다.
 */
async function requestLogout() {
  const refreshToken = await readRefreshToken();

  // 서버가 빈 리프레시 토큰을 400으로 거절하므로, 보낼 게 없으면 요청 자체를
  // 만들지 않는다(`refreshAccessToken`과 같은 판단). 지울 세션은 어차피 아래
  // `onSettled`가 정리한다.
  if (refreshToken === null) {
    return;
  }

  try {
    await logout({ refreshToken });
    return;
  } catch (error) {
    if (!isUnauthorized(error)) {
      throw error;
    }

    // 재발급이 실패하는 경우(리프레시 토큰까지 만료, 다른 기기 로그인으로 저장된
    // 토큰이 교체됨)는 서버에서 더 정리할 게 없거나 정리할 방법이 없다. 원래 401을
    // 그대로 올려보내 화면이 안내하게 한다.
    if (!(await refreshAccessToken())) {
      throw error;
    }

    // 회전된 새 리프레시 토큰을 Keychain에서 다시 읽는다. 이 재읽기가 이 함수의
    // 존재 이유다 — 위 refreshToken 변수는 이미 폐기된 값이다.
    const rotatedRefreshToken = await readRefreshToken();

    if (rotatedRefreshToken === null) {
      throw error;
    }

    await logout({ refreshToken: rotatedRefreshToken });
  }
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestLogout,
    // onSuccess/onError보다 늦게 돌기 때문에, 화면이 에러를 먼저 받아 알린 뒤에
    // 세션이 정리된다(정리하면 화면이 로그인으로 교체되어 사라진다).
    onSettled: async () => {
      await signOut();
      // 이전 계정의 응답이 다음 로그인 뒤에 남아 보이지 않도록 비운다. 온보딩·권한
      // 처럼 기기에 속한 값은 계정 데이터가 아니라 남긴다 — 지우면 진입 게이트가
      // 미완료로 읽혀 로그인 화면 대신 온보딩으로 간다.
      queryClient.removeQueries({
        predicate: query => !isDeviceQuery(query.queryKey),
      });
    },
  });
}
