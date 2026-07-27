import { ApiError } from './ApiError';
import { getAccessToken } from './accessTokenStore';
import { BASE_URL } from './baseUrl';
import { refreshAccessToken } from './refreshAccessToken';

const NO_CONTENT_STATUS = 204;
const UNAUTHORIZED_STATUS = 401;

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

async function readErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  if (typeof body?.message === 'string' && body.message.length > 0) {
    return body.message;
  }

  return `Request failed: ${response.status} ${response.statusText}`;
}

function send(
  path: string,
  options: RequestOptions,
  accessToken: string | null,
) {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    // 로그인 응답의 Set-Cookie(refreshToken)를 네이티브 쿠키 저장소가 받아두게
    // 하는 스위치. RN 기본값이 이미 이것이지만, 세션 유지가 여기에 달려 있어
    // 명시한다.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : null),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const accessToken = getAccessToken();

  let response = await send(path, options, accessToken);

  // 토큰을 실어 보냈는데도 401이면 액세스 토큰이 만료된 것이므로, 쿠키에 남은
  // refreshToken으로 한 번만 재발급하고 같은 요청을 다시 보낸다. 애초에 토큰이
  // 없었다면(로그인 실패 등) 재발급할 이유가 없어 그대로 에러를 낸다.
  if (accessToken !== null && response.status === UNAUTHORIZED_STATUS) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      response = await send(path, options, getAccessToken());
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === NO_CONTENT_STATUS) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
