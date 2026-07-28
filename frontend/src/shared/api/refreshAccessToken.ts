import { setAccessToken } from './accessTokenStore';
import { BASE_URL } from './baseUrl';
import {
  clearRefreshToken,
  readRefreshToken,
  saveRefreshToken,
} from './refreshTokenStore';

// `/auth/reissue`만 `features/auth/api`가 아니라 여기 있는 이유: client가 401을
// 받은 자리에서 직접 호출해야 하는데, features -> shared 단방향 의존을 지키려면
// 재발급 요청이 client와 같은 계층에 있어야 한다.
const REISSUE_PATH = '/auth/reissue';

type ReissueResponse = {
  accessToken?: unknown;
  refreshToken?: unknown;
};

// 동시에 여러 요청이 401을 받아도 재발급은 한 번만 보낸다. 백엔드가 재발급마다
// refreshToken을 회전시키고 저장된 값과 다르면 세션을 폐기하므로, 병렬로 부르면
// 뒤늦은 요청이 이미 교체된 토큰을 들고 가 탈취로 오인받고 즉시 로그아웃된다.
let inFlight: Promise<boolean> | null = null;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

async function requestReissue(): Promise<boolean> {
  const refreshToken = await readRefreshToken();

  // 저장된 토큰이 없으면 보낼 게 없다. 서버가 빈 값을 거절하므로 요청 자체를
  // 만들지 않는다.
  if (refreshToken === null) {
    return false;
  }

  // Authorization은 일부러 붙이지 않는다 — 만료된 액세스 토큰은 재발급에
  // 필요 없고 서버도 이 경로에서 요구하지 않는다.
  const response = await fetch(`${BASE_URL}${REISSUE_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return false;
  }

  const body = (await response
    .json()
    .catch(() => null)) as ReissueResponse | null;

  if (
    !isNonEmptyString(body?.accessToken) ||
    !isNonEmptyString(body?.refreshToken)
  ) {
    return false;
  }

  // 회전된 새 토큰을 먼저 저장한다. 저장에 실패하면 기기에 폐기된 구토큰이
  // 남아 다음 실행에서 재사용 탐지에 걸리므로, 액세스 토큰을 세팅하지 않고
  // 실패로 흘려보내 저장소까지 정리되게 한다.
  await saveRefreshToken(body.refreshToken);
  setAccessToken(body.accessToken);
  return true;
}

/**
 * 저장된 리프레시 토큰으로 액세스 토큰을 재발급한다.
 *
 * 성공하면 새 액세스 토큰을 `accessTokenStore`에, 회전된 리프레시 토큰을
 * `refreshTokenStore`에 반영하고 true를 반환한다. 토큰이 없거나 만료됐으면
 * 양쪽을 모두 비우고 false를 반환하며, 그 시점에 AuthProvider가 로그인 화면으로
 * 되돌린다. 네트워크 실패도 같은 실패로 취급한다 — 액세스 토큰이 이미 죽은
 * 상태라 세션을 이어갈 방법이 없다.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (inFlight === null) {
    inFlight = requestReissue()
      .catch(() => false)
      .then(async succeeded => {
        if (!succeeded) {
          setAccessToken(null);
          // Keychain에는 만료 개념이 없어 실패한 토큰을 직접 지워야 한다.
          // 두면 앱을 켤 때마다 죽은 토큰으로 재발급을 시도한다.
          await clearRefreshToken();
        }
        return succeeded;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}
