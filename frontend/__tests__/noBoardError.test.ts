/**
 * @format
 */

import { isNoBoardError } from '../src/features/bingo/hooks/useActiveBingoBoardQuery';
import { ApiError } from '../src/shared/api/ApiError';

describe('isNoBoardError', () => {
  test('404·409는 "판이 없다"로 본다', () => {
    // 409 = 게임이 진행 중이 아님, 404 = 판을 못 찾음.
    expect(isNoBoardError(new ApiError(409, 'ROOM_NOT_IN_PROGRESS'))).toBe(true);
    expect(isNoBoardError(new ApiError(404, 'BINGO_BOARD_NOT_FOUND'))).toBe(
      true,
    );
  });

  test('서버 장애(5xx)는 "판이 없다"가 아니다', () => {
    // 이 구분이 무너지면 서버가 죽은 동안 몰수 판정이 나간다.
    // 2026-08-06 dev 백엔드가 내려갔을 때 502를 게임 종료로 읽어
    // "상대가 기권했다"가 실기기에서 잘못 떴다.
    expect(isNoBoardError(new ApiError(502, 'Request failed: 502'))).toBe(false);
    expect(isNoBoardError(new ApiError(500, 'Request failed: 500'))).toBe(false);
    expect(isNoBoardError(new ApiError(503, 'Request failed: 503'))).toBe(false);
    expect(isNoBoardError(new ApiError(504, 'Request failed: 504'))).toBe(false);
  });

  test('인증·권한 오류도 "판이 없다"가 아니다', () => {
    expect(isNoBoardError(new ApiError(401, '인증이 필요합니다'))).toBe(false);
    expect(isNoBoardError(new ApiError(403, 'WALK_SESSION_FORBIDDEN'))).toBe(
      false,
    );
  });

  test('네트워크 실패처럼 응답이 없는 에러도 아니다', () => {
    expect(isNoBoardError(new TypeError('Network request failed'))).toBe(false);
    expect(isNoBoardError(undefined)).toBe(false);
    expect(isNoBoardError(null)).toBe(false);
  });
});
