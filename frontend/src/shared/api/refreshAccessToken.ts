import { UNAUTHORIZED_STATUS } from './ApiError';
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

/**
 * 재발급 시도의 결과.
 *
 * - `success`: 새 토큰을 반영했다.
 * - `rejected`: 서버가 거절했거나 저장된 토큰이 없다. 저장소를 비웠다.
 * - `unavailable`: 서버에 닿지 못했다. 리프레시 토큰을 남겼으므로 다시 시도하면
 *   세션이 되살아날 수 있다.
 */
export type RefreshResult = 'success' | 'rejected' | 'unavailable';

// 동시에 여러 요청이 401을 받아도 재발급은 한 번만 보낸다. 백엔드가 재발급마다
// refreshToken을 회전시키고 저장된 값과 다르면 세션을 폐기하므로, 병렬로 부르면
// 뒤늦은 요청이 이미 교체된 토큰을 들고 가 탈취로 오인받고 즉시 로그아웃된다.
let inFlight: Promise<RefreshResult> | null = null;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

async function requestReissue(): Promise<RefreshResult> {
  const refreshToken = await readRefreshToken();

  // 저장된 토큰이 없으면 보낼 게 없다. 서버가 빈 값을 거절하므로 요청 자체를
  // 만들지 않는다.
  if (refreshToken === null) {
    return 'rejected';
  }

  let response: Response;

  try {
    // Authorization은 일부러 붙이지 않는다 — 만료된 액세스 토큰은 재발급에
    // 필요 없고 서버도 이 경로에서 요구하지 않는다.
    response = await fetch(`${BASE_URL}${REISSUE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // 응답을 받지 못했으므로 서버가 이 토큰을 판단한 적이 없다. 지울 근거가 없다.
    return 'unavailable';
  }

  // 401만 세션 폐기로 본다. 백엔드는 만료·서명 오류·저장값 불일치를 모두
  // REFRESH_TOKEN_INVALID로 수렴시키고(`AuthService.reissue`), 이 경로는 permitAll
  // 이라 403이 나올 수 없다. 5xx를 여기 넣으면 서버가 잠깐 죽은 것만으로 세션이
  // 영구 삭제된다.
  if (!response.ok) {
    return response.status === UNAUTHORIZED_STATUS ? 'rejected' : 'unavailable';
  }

  const body = (await response
    .json()
    .catch(() => null)) as ReissueResponse | null;

  if (
    !isNonEmptyString(body?.accessToken) ||
    !isNonEmptyString(body?.refreshToken)
  ) {
    // 200인데 본문이 규약과 다르다. 서버나 프록시 문제라 폐기 근거가 못 된다.
    return 'unavailable';
  }

  try {
    await saveRefreshToken(body.refreshToken);
  } catch {
    // 서버가 이미 회전시켜 구토큰은 죽었다. 남기면 다음 실행에서 재사용 탐지에
    // 걸려 세션이 통째로 날아가므로 정리하고 다시 로그인시킨다.
    return 'rejected';
  }

  setAccessToken(body.accessToken);
  return 'success';
}

/**
 * 저장된 리프레시 토큰으로 액세스 토큰을 재발급한다.
 *
 * 실패했을 때 리프레시 토큰을 지우는지는 실패 종류에 따라 갈린다.
 * `RefreshResult` 참고.
 */
export function refreshAccessToken(): Promise<RefreshResult> {
  if (inFlight === null) {
    inFlight = requestReissue()
      .catch((): RefreshResult => 'unavailable')
      .then(async result => {
        if (result === 'success') {
          return result;
        }

        setAccessToken(null);

        // 닿지 못한 것뿐이면 세션은 살아 있다. Keychain에는 만료 개념이 없어 죽은
        // 토큰만 직접 지운다.
        if (result === 'rejected') {
          await clearRefreshToken();
        }

        return result;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}
