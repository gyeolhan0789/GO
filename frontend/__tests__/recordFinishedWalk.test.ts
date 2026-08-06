/**
 * @format
 */

import { recordFinishedWalk } from '../src/features/walk-session/model/recordFinishedWalk';
import {
  clearActiveWalkSession,
  readActiveWalkSession,
  writeActiveWalkSession,
} from '../src/features/walk-session/model/activeSessionStorage';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

const ROOM_ID = 12;
const WALK_SESSION_KEY = '2f1c8e5a-0000-4000-8000-000000000001';

/** 산책이 끝난 시각. 재시도해도 이 값이 흔들리면 안 된다. */
const ENDED_AT = new Date('2026-08-04T11:32:00.000Z');

const FINISHED_WALK = {
  roomId: ROOM_ID,
  endedAt: ENDED_AT,
  activeDurationSeconds: 1_680,
  step: 3_240,
  distance: 2_400,
  calories: 118,
};

function buildCompleteResponse() {
  return {
    walkSessionId: 7,
    roomId: ROOM_ID,
    roomName: '황덕',
    mode: 'SINGLE',
    startedAt: '2026-08-04T11:00:00Z',
    endedAt: '2026-08-04T11:32:00Z',
    durationSeconds: 1_920,
    activeDurationSeconds: 1_680,
    step: 3_240,
    distance: 2_400,
    calories: 118,
    initialBingoBoardId: 900,
    achievedMissionCount: 2,
    earnedPoint: 50,
  };
}

let fetchMock: FetchMock;

// clearAllMockStorages()는 레지스트리만 비우고, 모듈이 import 시점에 붙잡은
// 저장소 인스턴스는 그대로 둔다. 실제로 지우려면 저장소 API로 지워야 한다.
beforeEach(async () => {
  await clearActiveWalkSession();
  fetchMock = installFetchMock();
});

function completeCalls() {
  return fetchMock.mock.calls.filter(
    ([url, init]) => url.endsWith('/walk-sessions') && init?.method === 'POST',
  );
}

function bodyOf(call: [string, RequestInit?]) {
  return JSON.parse(String(call[1]?.body));
}

async function storeKey(roomId = ROOM_ID) {
  await writeActiveWalkSession({
    walkSessionKey: WALK_SESSION_KEY,
    roomId,
    expiresAt: '2026-08-05T11:00:00Z',
  });
}

describe('recordFinishedWalk — 기록으로 남을 때', () => {
  test('산책 완료 요청 하나로만 올린다', async () => {
    // 서버가 이 요청 안에서 그날 걸음 합계까지 누적한다. /histories를 같이
    // 부르면 같은 걸음이 두 번 더해진다.
    await storeKey();
    fetchMock.mockResolvedValue(jsonResponse(201, buildCompleteResponse()));

    const outcome = await recordFinishedWalk(FINISHED_WALK);

    expect(outcome).toEqual({
      status: 'recorded',
      walkSession: buildCompleteResponse(),
    });
    expect(fetchMock.mock.calls).toHaveLength(1);
  });

  test('기록으로 남았으면 저장해둔 키를 지운다', async () => {
    await storeKey();
    fetchMock.mockResolvedValue(jsonResponse(201, buildCompleteResponse()));

    await recordFinishedWalk(FINISHED_WALK);

    // 남겨두면 다음 산책 시작 때 이미 끝난 세션을 물고 간다.
    expect(await readActiveWalkSession()).toBeNull();
  });

  test('일시정지를 뺀 시간과 종료 시각을 그대로 싣는다', async () => {
    await storeKey();
    fetchMock.mockResolvedValue(jsonResponse(201, buildCompleteResponse()));

    await recordFinishedWalk(FINISHED_WALK);

    expect(bodyOf(completeCalls()[0])).toEqual({
      walkSessionKey: WALK_SESSION_KEY,
      endedAt: ENDED_AT.toISOString(),
      activeDurationSeconds: 1_680,
      step: 3_240,
      distance: 2_400,
      calories: 118,
    });
  });
});

describe('recordFinishedWalk — 세션 키를 못 쓸 때', () => {
  test('키가 없으면 아무것도 보내지 않는다', async () => {
    const outcome = await recordFinishedWalk(FINISHED_WALK);

    expect(outcome.status).toBe('failed');
    expect(fetchMock.mock.calls).toHaveLength(0);
  });

  test('저장된 키가 다른 방 것이면 쓰지 않는다', async () => {
    // 그 키로 끝내면 이번 산책의 수치가 엉뚱한 방의 기록이 된다.
    await storeKey(ROOM_ID + 1);

    const outcome = await recordFinishedWalk(FINISHED_WALK);

    expect(outcome.status).toBe('failed');
    expect(fetchMock.mock.calls).toHaveLength(0);
  });
});

describe('recordFinishedWalk — 서버가 거절할 때', () => {
  test('못 쓰는 키는 지운다', async () => {
    await storeKey();
    fetchMock.mockResolvedValue(
      jsonResponse(409, { message: '만료된 산책 세션입니다.' }),
    );

    const outcome = await recordFinishedWalk(FINISHED_WALK);

    expect(outcome).toEqual({
      status: 'failed',
      message: '만료된 산책 세션입니다.',
    });
    expect(await readActiveWalkSession()).toBeNull();
  });

  test('거절은 재시도하지 않는다', async () => {
    await storeKey();
    fetchMock.mockResolvedValue(
      jsonResponse(409, { message: '만료된 산책 세션입니다.' }),
    );

    await recordFinishedWalk(FINISHED_WALK);

    // 서버가 판단해서 돌려보낸 것이라 다시 보내도 결과가 같다.
    expect(completeCalls()).toHaveLength(1);
  });
});

describe('recordFinishedWalk — 응답을 못 받을 때', () => {
  test('한 번은 다시 보낸다', async () => {
    // 완료 요청은 같은 키에 멱등이라 재전송이 안전하다.
    await storeKey();
    fetchMock
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValue(jsonResponse(200, buildCompleteResponse()));

    const outcome = await recordFinishedWalk(FINISHED_WALK);

    expect(outcome.status).toBe('recorded');
    expect(completeCalls()).toHaveLength(2);
  });

  test('재전송에도 종료 시각을 다시 찍지 않는다', async () => {
    await storeKey();
    fetchMock
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValue(jsonResponse(200, buildCompleteResponse()));

    await recordFinishedWalk(FINISHED_WALK);

    // 매번 새로 찍으면 재시도할 때마다 산책 시간이 늘어난다.
    const [first, second] = completeCalls().map(bodyOf);
    expect(first.endedAt).toBe(ENDED_AT.toISOString());
    expect(second.endedAt).toBe(first.endedAt);
  });

  test('두 번 다 실패하면 키를 남겨둔다', async () => {
    // 서버가 이미 기록을 만들어뒀을 수 있다. 다음 시작 때 이 키로 판정한다.
    await storeKey();
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    const outcome = await recordFinishedWalk(FINISHED_WALK);

    expect(outcome.status).toBe('failed');
    expect(await readActiveWalkSession()).not.toBeNull();
  });
});
