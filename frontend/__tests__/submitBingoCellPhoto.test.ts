/**
 * @format
 */

import { submitBingoCellPhoto } from '../src/features/bingo/api/bingoApi';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

const ROOM_ID = 12;
const CELL_ID = 340;
const WALK_SESSION_KEY = '2f1c8e5a-0000-4000-8000-000000000001';

const PHOTO = {
  uri: 'file:///mission.jpg',
  type: 'image/jpeg',
  fileName: 'mission.jpg',
};

function approvedResponse() {
  return {
    cellId: CELL_ID,
    row: 0,
    col: 0,
    mission: {
      missionId: 1,
      missionImageUrl: null,
      type: 'OBJECT',
      title: '벤치 앞에서 촬영',
      detail: '',
      decisionCondition: '',
    },
    verificationStatus: 'APPROVED',
    submittedByMemberId: 1,
    rejectionReason: null,
    rewardPoint: 30,
  };
}

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockResolvedValue(jsonResponse(200, approvedResponse()));
});

function requestUrl(): string {
  return fetchMock.mock.calls[0][0];
}

/**
 * 보낸 멀티파트의 필드 이름들. FormData는 JSON.stringify로는 `{}`라서 그대로
 * 검사하면 무엇을 넣든 통과해버린다.
 */
function sentFieldNames(): string[] {
  const body = fetchMock.mock.calls[0][1]?.body;
  if (!(body instanceof FormData)) {
    throw new Error('멀티파트로 보내지 않았다');
  }
  // React Native의 FormData 타입 선언에는 keys()가 없다. 테스트가 도는 곳은
  // 스펙 구현이라 실제로는 있다.
  const fields = body as unknown as { keys(): Iterable<string> };
  return Array.from(fields.keys());
}

/**
 * 이 인증을 어느 산책에 귀속시킬지는 이 요청 하나로 정해진다. 키가 안 실려도
 * 칸은 정상 승인되고 에러도 안 나서, 잘못 붙이면 조용히 산책 기록에서만
 * 빠진다 — 그래서 붙는 자리를 테스트로 못박아 둔다.
 */
describe('submitBingoCellPhoto — 산책 세션 귀속', () => {
  test('산책 중이면 walkSessionKey를 쿼리로 붙인다', async () => {
    await submitBingoCellPhoto(ROOM_ID, CELL_ID, PHOTO, WALK_SESSION_KEY);

    expect(requestUrl()).toContain(
      `/rooms/${ROOM_ID}/bingo-boards/cells/${CELL_ID}/submit`,
    );
    expect(requestUrl()).toContain(`?walkSessionKey=${WALK_SESSION_KEY}`);
  });

  test('산책 밖이면 쿼리를 아예 붙이지 않는다', async () => {
    await submitBingoCellPhoto(ROOM_ID, CELL_ID, PHOTO, null);

    expect(requestUrl()).toContain(
      `/rooms/${ROOM_ID}/bingo-boards/cells/${CELL_ID}/submit`,
    );
    expect(requestUrl()).not.toContain('?');
  });

  test('키는 본문이 아니라 쿼리로 간다', async () => {
    // 서버가 @RequestParam으로 받는다. 멀티파트에 넣으면 무시된다.
    await submitBingoCellPhoto(ROOM_ID, CELL_ID, PHOTO, WALK_SESSION_KEY);

    expect(sentFieldNames()).toEqual(['image']);
  });

  test('승인 결과를 그대로 돌려준다', async () => {
    const result = await submitBingoCellPhoto(
      ROOM_ID,
      CELL_ID,
      PHOTO,
      WALK_SESSION_KEY,
    );

    expect(result).toEqual({ status: 'APPROVED', rewardPoint: 30 });
  });

  test('반려되면 사유를 채워 돌려준다', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        ...approvedResponse(),
        verificationStatus: 'REJECTED',
        rejectionReason: '사진에서 확인할 수 없어요.',
      }),
    );

    const result = await submitBingoCellPhoto(
      ROOM_ID,
      CELL_ID,
      PHOTO,
      WALK_SESSION_KEY,
    );

    expect(result).toEqual({
      status: 'REJECTED',
      rejectionReason: '사진에서 확인할 수 없어요.',
    });
  });
});
