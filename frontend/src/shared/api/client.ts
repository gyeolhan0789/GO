import { ApiError, UNAUTHORIZED_STATUS } from './ApiError';
import { getAccessToken } from './accessTokenStore';
import { BASE_URL } from './baseUrl';
import { refreshAccessToken } from './refreshAccessToken';

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

type SendOptions = {
  /**
   * 401일 때 재발급하고 같은 요청을 한 번 더 보낼지. 기본은 true.
   *
   * 재시도는 Authorization 헤더만 갈아끼우고 바디는 그대로 다시 보낸다. 재발급으로
   * 회전되는 값을 바디에 싣는 요청은 이 스위치를 끄고 직접 재시도해야 한다.
   */
  retryOnUnauthorized?: boolean;
};

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
  { retryOnUnauthorized = true }: SendOptions = {},
): Promise<T> {
  const accessToken = getAccessToken();

  let response = await send(path, options, accessToken);

  // 토큰을 실어 보냈는데도 401이면 액세스 토큰이 만료된 것이므로, 쿠키에 남은
  // refreshToken으로 한 번만 재발급하고 같은 요청을 다시 보낸다. 애초에 토큰이
  // 없었다면(로그인 실패 등) 재발급할 이유가 없어 그대로 에러를 낸다.
  if (
    retryOnUnauthorized &&
    accessToken !== null &&
    response.status === UNAUTHORIZED_STATUS
  ) {
    if ((await refreshAccessToken()) === 'success') {
      response = await send(path, options, getAccessToken());
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  // 204뿐 아니라 201 등 다른 성공 상태도 본문 없이 응답할 수 있어(예: 친구 요청
  // 보내기), 상태 코드 대신 실제 본문 유무로 판단한다.
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, sendOptions?: SendOptions) =>
    request<T>(path, { method: 'POST', body }, sendOptions),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
