import { API_BASE_URL } from '@env';

import { ApiError } from './ApiError';
import { getAccessToken } from './accessTokenStore';

// `.env`가 없을 때의 개발 기본값.
// Android(에뮬레이터/실기기)는 Metro와 같은 방식으로 `adb reverse tcp:8080 tcp:8080`을
// 걸어야 이 주소가 호스트로 터널된다. `npm run android:reverse` 참고.
const DEFAULT_BASE_URL = 'http://localhost:8080';

const BASE_URL = API_BASE_URL || DEFAULT_BASE_URL;

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

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const accessToken = getAccessToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : null),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

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
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
