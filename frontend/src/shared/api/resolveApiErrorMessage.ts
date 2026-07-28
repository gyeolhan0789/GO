import { ApiError } from './ApiError';

const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';

/**
 * 사용자에게 보여줄 에러 문구를 고른다. 서버가 응답한 ApiError는 백엔드가 내려준
 * 한국어 메시지를 그대로 쓰고, fetch 자체 실패(네트워크 단절 등)처럼 서버 응답이
 * 없는 경우에는 영어 원문 대신 안내 문구로 대체한다.
 */
export function resolveApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return NETWORK_ERROR_MESSAGE;
}
