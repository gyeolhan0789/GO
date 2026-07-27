import { setAccessToken } from './accessTokenStore';
import { BASE_URL } from './baseUrl';

// `/auth/reissue`만 `features/auth/api`가 아니라 여기 있는 이유: client가 401을
// 받은 자리에서 직접 호출해야 하는데, features -> shared 단방향 의존을 지키려면
// 재발급 요청이 client와 같은 계층에 있어야 한다.
const REISSUE_PATH = '/auth/reissue';

type ReissueResponse = {
  accessToken?: unknown;
};

// 동시에 여러 요청이 401을 받아도 재발급은 한 번만 보낸다. 백엔드가 재발급마다
// refreshToken을 회전시키므로(`/auth/reissue` 문서 참고), 병렬로 부르면 뒤늦은
// 요청이 이미 폐기된 토큰을 들고 가 탈취로 오인받고 세션이 즉시 끊긴다.
let inFlight: Promise<boolean> | null = null;

async function requestReissue(): Promise<boolean> {
  // refreshToken은 HttpOnly 쿠키라 JS가 읽을 수 없다. RN의 네이티브 계층이
  // 붙여 보낸다(withCredentials 기본값 true). Authorization은 일부러 붙이지
  // 않는다 — 만료된 액세스 토큰은 재발급에 필요 없다.
  const response = await fetch(`${BASE_URL}${REISSUE_PATH}`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    return false;
  }

  const body = (await response
    .json()
    .catch(() => null)) as ReissueResponse | null;

  if (typeof body?.accessToken !== 'string' || body.accessToken.length === 0) {
    return false;
  }

  setAccessToken(body.accessToken);
  return true;
}

/**
 * 쿠키에 남아 있는 refreshToken으로 액세스 토큰을 재발급한다.
 *
 * 성공하면 새 토큰을 `accessTokenStore`에 반영하고 true를 반환한다. refreshToken이
 * 없거나 만료됐으면(401) 저장된 토큰을 비우고 false를 반환하며, 그 시점에
 * AuthProvider가 로그인 화면으로 되돌린다. 네트워크 실패도 같은 실패로 취급한다
 * — 액세스 토큰이 이미 죽은 상태라 세션을 이어갈 방법이 없다.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (inFlight === null) {
    inFlight = requestReissue()
      .catch(() => false)
      .then(succeeded => {
        if (!succeeded) {
          setAccessToken(null);
        }
        return succeeded;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}
