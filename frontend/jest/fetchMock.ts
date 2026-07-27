/**
 * `globalThis.fetch`를 테스트에서 대체하기 위한 헬퍼. RN의 fetch는 네이티브 XHR을
 * 타므로 jest에서는 응답이 영영 오지 않는다(핸들이 열린 채 남는다). 네트워크
 * 경계를 여기서 끊는다.
 */

type MockResponseBody = Record<string, unknown> | null;

const OK_STATUS_MIN = 200;
const OK_STATUS_MAX = 299;

export function jsonResponse(status: number, body: MockResponseBody = null) {
  return {
    ok: status >= OK_STATUS_MIN && status <= OK_STATUS_MAX,
    status,
    statusText: '',
    json: async () => {
      if (body === null) {
        throw new Error('no body');
      }
      return body;
    },
  } as unknown as Response;
}

export type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

/**
 * `globalThis.fetch`를 jest mock으로 바꾸고 그 mock을 돌려준다. 각 테스트의
 * `beforeEach`에서 호출해 호출 기록을 초기화한다.
 */
export function installFetchMock(): FetchMock {
  const fetchMock: FetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
