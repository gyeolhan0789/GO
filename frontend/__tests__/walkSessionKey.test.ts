/**
 * @format
 */

import {
  awaitWalkSessionKey,
  confirmWalkSessionStart,
  endWalkSession,
  hydrateWalkSessionFromNative,
  startWalkSession,
  stopWalkSession,
} from '../src/features/walk-session/model/walkSessionStore';
import {
  clearActiveWalkSession,
  readActiveWalkSession,
  writeActiveWalkSession,
} from '../src/features/walk-session/model/activeSessionStorage';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import type { WalkSessionSnapshot } from '../src/shared/lib/walkTracking';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// 네이티브 세션은 이 테스트의 관심사가 아니다. 없으면 walkTracking이 IDLE을
// 돌려주는데, 그러면 스토어가 산책을 끝난 것으로 보고 키 발급을 접는다.
jest.mock('../src/shared/lib/walkTracking', () => ({
  getWalkTrackingSnapshot: jest.fn(),
  startWalkTrackingSession: jest.fn(),
  stopWalkTrackingSession: jest.fn(),
  pauseWalkTrackingSession: jest.fn(),
  resumeWalkTrackingSession: jest.fn(),
  subscribeWalkTrackingState: jest.fn(() => () => {}),
}));

const walkTracking = require('../src/shared/lib/walkTracking');

const ROOM_ID = 12;
const OTHER_ROOM_ID = 99;
const WALK_SESSION_KEY = '2f1c8e5a-0000-4000-8000-000000000001';
const STORED_KEY = '2f1c8e5a-0000-4000-8000-000000000002';
const BINGO_BOARD_ID = 900;

function runningSnapshot(roomId: number): WalkSessionSnapshot {
  return {
    sessionId: 'native-1',
    roomId,
    status: 'RUNNING',
    startedAt: Date.now(),
    activeElapsedMs: 0,
    steps: 0,
    distanceMeters: 0,
    calories: 0,
  };
}

const IDLE_SNAPSHOT: WalkSessionSnapshot = {
  sessionId: null,
  roomId: null,
  status: 'IDLE',
  startedAt: null,
  activeElapsedMs: 0,
  steps: 0,
  distanceMeters: 0,
  calories: 0,
};

let fetchMock: FetchMock;

/** 시작 요청에 서버가 어느 방 세션을 돌려줄지 정한다. */
function mockServer({ startedRoomId = ROOM_ID } = {}) {
  fetchMock.mockImplementation(async url => {
    if (url.includes('/bingo-boards/active')) {
      return jsonResponse(200, { bingoBoardId: BINGO_BOARD_ID });
    }
    if (url.endsWith('/walk-sessions/start')) {
      return jsonResponse(201, {
        walkSessionKey: WALK_SESSION_KEY,
        roomId: startedRoomId,
        roomName: '황덕',
        mode: 'SINGLE',
        initialBingoBoardId: BINGO_BOARD_ID,
        startedAt: '2026-08-04T11:00:00Z',
        expiresAt: '2026-08-05T11:00:00Z',
      });
    }
    throw new Error(`예상하지 못한 요청: ${url}`);
  });
}

function startCalls() {
  return fetchMock.mock.calls.filter(([url]) =>
    url.endsWith('/walk-sessions/start'),
  );
}

// clearAllMockStorages()는 레지스트리만 비우고, 모듈이 import 시점에 붙잡은
// 저장소 인스턴스는 그대로 둔다. 실제로 지우려면 저장소 API로 지워야 한다.
beforeEach(async () => {
  await clearActiveWalkSession();
  fetchMock = installFetchMock();
  walkTracking.startWalkTrackingSession.mockResolvedValue(
    runningSnapshot(ROOM_ID),
  );
  walkTracking.stopWalkTrackingSession.mockResolvedValue(IDLE_SNAPSHOT);
  walkTracking.getWalkTrackingSnapshot.mockResolvedValue(IDLE_SNAPSHOT);
});

// 모듈 싱글턴이라 테스트끼리 상태가 새어나간다.
afterEach(endWalkSession);

describe('산책 세션 키 발급', () => {
  test('카운트다운이 끝나면 활성 빙고판과 함께 세션을 연다', async () => {
    startWalkSession(ROOM_ID);
    mockServer();

    confirmWalkSessionStart(null);
    await awaitWalkSessionKey(ROOM_ID);

    // 판을 같이 넘겨야 미션을 하나도 못 깬 산책도 상세에 빙고판이 나온다.
    expect(JSON.parse(String(startCalls()[0][1]?.body))).toEqual({
      roomId: ROOM_ID,
      bingoBoardId: BINGO_BOARD_ID,
    });
  });

  test('발급이 끝나기 전에 물어봐도 키를 놓치지 않는다', async () => {
    // 카운트다운 직후 곧장 미션을 제출하는 경우다. 기다리지 않으면 그 인증이
    // 이 산책에 안 붙는다.
    startWalkSession(ROOM_ID);
    mockServer();
    confirmWalkSessionStart(null);

    await expect(awaitWalkSessionKey(ROOM_ID)).resolves.toBe(WALK_SESSION_KEY);
  });

  test('받은 키를 기기에 저장한다', async () => {
    startWalkSession(ROOM_ID);
    mockServer();

    confirmWalkSessionStart(null);
    await awaitWalkSessionKey(ROOM_ID);

    expect(await readActiveWalkSession()).toEqual({
      walkSessionKey: WALK_SESSION_KEY,
      roomId: ROOM_ID,
      expiresAt: '2026-08-05T11:00:00Z',
    });
  });

  test('빙고판을 못 읽어도 세션은 연다', async () => {
    startWalkSession(ROOM_ID);
    fetchMock.mockImplementation(async url => {
      if (url.includes('/bingo-boards/active')) {
        return jsonResponse(404, { message: '빙고판이 없습니다.' });
      }
      return jsonResponse(201, {
        walkSessionKey: WALK_SESSION_KEY,
        roomId: ROOM_ID,
        roomName: '황덕',
        mode: 'SINGLE',
        initialBingoBoardId: null,
        startedAt: '2026-08-04T11:00:00Z',
        expiresAt: '2026-08-05T11:00:00Z',
      });
    });

    confirmWalkSessionStart(null);

    await expect(awaitWalkSessionKey(ROOM_ID)).resolves.toBe(WALK_SESSION_KEY);
  });

  test('발급에 실패해도 산책은 계속된다', async () => {
    startWalkSession(ROOM_ID);
    fetchMock.mockRejectedValue(new Error('Network request failed'));

    confirmWalkSessionStart(null);

    await expect(awaitWalkSessionKey(ROOM_ID)).resolves.toBeNull();
    expect(await readActiveWalkSession()).toBeNull();
  });
});

describe('다른 방 세션이 남아 있을 때', () => {
  test('서버가 다른 방 세션을 돌려주면 그 키를 쓰지 않는다', async () => {
    // 활성 세션은 회원당 하나뿐이라, 못 끝낸 산책이 있으면 서버가 요청한 방을
    // 무시하고 그걸 돌려준다. 그 키로 끝내면 엉뚱한 방의 기록이 된다.
    startWalkSession(ROOM_ID);
    mockServer({ startedRoomId: OTHER_ROOM_ID });

    confirmWalkSessionStart(null);

    await expect(awaitWalkSessionKey(ROOM_ID)).resolves.toBeNull();
    expect(await readActiveWalkSession()).toBeNull();
  });
});

describe('미션 제출이 물어보는 방 확인', () => {
  test('산책 중이 아니면 키가 없다', async () => {
    await expect(awaitWalkSessionKey(ROOM_ID)).resolves.toBeNull();
  });

  test('지금 걷는 방이 아니면 키를 주지 않는다', async () => {
    // 다른 방 판에서 낸 인증이 이 산책에 붙으면, 종료할 때 서버가 방이
    // 어긋났다며 거절해 산책 전체가 기록에 안 남는다.
    startWalkSession(ROOM_ID);
    mockServer();
    confirmWalkSessionStart(null);
    await awaitWalkSessionKey(ROOM_ID);

    await expect(awaitWalkSessionKey(OTHER_ROOM_ID)).resolves.toBeNull();
  });
});

describe('산책이 끝난 뒤', () => {
  test('다음 산책에 이전 키가 따라오지 않는다', async () => {
    startWalkSession(ROOM_ID);
    mockServer();
    confirmWalkSessionStart(null);
    await awaitWalkSessionKey(ROOM_ID);

    await stopWalkSession();

    // 저장소의 키는 아직 종료 요청에 써야 해서 남지만, 진행 중 상태는 비었다.
    await expect(awaitWalkSessionKey(ROOM_ID)).resolves.toBeNull();
  });

  test('네이티브를 멈춰도 저장해둔 키는 지우지 않는다', async () => {
    // 이 키가 있어야 이 산책이 기록으로 남는다.
    startWalkSession(ROOM_ID);
    mockServer();
    confirmWalkSessionStart(null);
    await awaitWalkSessionKey(ROOM_ID);

    await stopWalkSession();

    expect(await readActiveWalkSession()).not.toBeNull();
  });
});

describe('앱이 다시 떴을 때 정합성 판정', () => {
  test('같은 방 키가 저장돼 있으면 그대로 이어받는다', async () => {
    await writeActiveWalkSession({
      walkSessionKey: STORED_KEY,
      roomId: ROOM_ID,
      expiresAt: '2026-08-05T11:00:00Z',
    });
    walkTracking.getWalkTrackingSnapshot.mockResolvedValue(
      runningSnapshot(ROOM_ID),
    );

    await hydrateWalkSessionFromNative();

    await expect(awaitWalkSessionKey(ROOM_ID)).resolves.toBe(STORED_KEY);
    // 이미 있는 키라 서버를 다시 부를 이유가 없다.
    expect(startCalls()).toHaveLength(0);
  });

  test('키를 잃었으면 다시 시작 요청해 되찾는다', async () => {
    // 서버는 활성 세션이 있으면 그대로 돌려주므로 이걸로 회수된다.
    walkTracking.getWalkTrackingSnapshot.mockResolvedValue(
      runningSnapshot(ROOM_ID),
    );
    mockServer();

    await hydrateWalkSessionFromNative();

    await expect(awaitWalkSessionKey(ROOM_ID)).resolves.toBe(WALK_SESSION_KEY);
  });

  test('저장된 키가 다른 방 것이면 이어받지 않는다', async () => {
    await writeActiveWalkSession({
      walkSessionKey: STORED_KEY,
      roomId: OTHER_ROOM_ID,
      expiresAt: '2026-08-05T11:00:00Z',
    });
    walkTracking.getWalkTrackingSnapshot.mockResolvedValue(
      runningSnapshot(ROOM_ID),
    );
    mockServer();

    await hydrateWalkSessionFromNative();

    await expect(awaitWalkSessionKey(ROOM_ID)).resolves.toBe(WALK_SESSION_KEY);
    expect(startCalls()).toHaveLength(1);
  });

  test('돌고 있는 산책이 없으면 저장된 키를 건드리지 않는다', async () => {
    // 아직 종료 요청을 못 보낸 산책의 키일 수 있다.
    await writeActiveWalkSession({
      walkSessionKey: STORED_KEY,
      roomId: ROOM_ID,
      expiresAt: '2026-08-05T11:00:00Z',
    });

    await hydrateWalkSessionFromNative();

    expect(await readActiveWalkSession()).not.toBeNull();
    expect(startCalls()).toHaveLength(0);
  });
});
