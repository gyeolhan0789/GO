/**
 * @format
 */

import { Alert } from 'react-native';

import { navigationRef } from '../src/app/navigation/navigationRef';
import type { WearRoom, WearState } from '../src/shared/lib/wearBridge';
import {
  endFromWatch,
  startFromWatch,
} from '../src/features/wear/model/watchCommandHandlers';
import {
  endWalkSession,
  getWalkSessionRoomId,
  isWalkSessionEndRequested,
  startWalkSession,
} from '../src/features/walk-session/model/walkSessionStore';

// 실제 네비게이터 없이 화면 이동만 관찰한다.
const navigate = jest.fn();
jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
// navigationRef.navigate는 readonly라 프로토타입 대신 참조를 직접 갈아끼운다.
(navigationRef as unknown as { navigate: unknown }).navigate = navigate;

const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

function room(overrides: Partial<WearRoom> = {}): WearRoom {
  return {
    roomId: 10,
    name: '동네 한 바퀴',
    mode: 'COOPERATE',
    memberCount: 3,
    completedMissionCount: 2,
    totalMissionCount: 25,
    startable: true,
    ...overrides,
  };
}

function state(rooms: WearRoom[]): WearState {
  return {
    nickname: '산책이 좋아',
    today: { steps: 0, distanceMeters: 0, calories: 0, goalSteps: 0 },
    rooms,
    session: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// 모듈 싱글턴이라 테스트끼리 상태가 새어나간다.
afterEach(endWalkSession);

describe('워치에서 산책 시작', () => {
  test('고른 방으로 세션을 시작하고 진행 중 화면을 띄운다', () => {
    startFromWatch(10, state([room()]));

    expect(getWalkSessionRoomId()).toBe(10);
    expect(navigate).toHaveBeenCalledWith('WalkSession');
  });

  test('빙고판 갱신이 필요한 방은 시작하지 않고 이유를 알린다', () => {
    startFromWatch(
      10,
      state([
        room({ startable: false, blockedReason: '방장이 목표를 설정하면 시작할 수 있어요' }),
      ]),
    );

    expect(getWalkSessionRoomId()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      '아직 시작할 수 없어요',
      '방장이 목표를 설정하면 시작할 수 있어요',
    );
  });

  test('이미 산책 중이면 새로 시작하지 않고 그 세션으로 데려간다', () => {
    startWalkSession(99);

    startFromWatch(10, state([room()]));

    expect(getWalkSessionRoomId()).toBe(99);
    expect(navigate).toHaveBeenCalledWith('WalkSession');
  });

  test('워치 목록에 없는 방이어도 시작을 막지 않는다', () => {
    // 폰 목록이 워치보다 최신일 수 있다. 모르는 방이라고 잠그면
    // 새로 만든 방을 워치에서 영영 못 쓴다.
    startFromWatch(10, state([]));

    expect(getWalkSessionRoomId()).toBe(10);
  });

  test('방 ID가 없으면 아무 일도 하지 않는다', () => {
    startFromWatch(undefined, state([room()]));

    expect(getWalkSessionRoomId()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('워치에서 산책 종료', () => {
  test('종료를 요청하고 진행 중 화면을 띄운다', () => {
    startWalkSession(10);

    endFromWatch();

    // 기록 저장과 결과 화면은 WalkSessionScreen이 이어받는다.
    expect(isWalkSessionEndRequested()).toBe(true);
    expect(getWalkSessionRoomId()).toBe(10);
    expect(navigate).toHaveBeenCalledWith('WalkSession');
  });

  test('진행 중인 산책이 없으면 아무 일도 하지 않는다', () => {
    endFromWatch();

    expect(isWalkSessionEndRequested()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('네비게이터가 아직 준비되지 않았을 때', () => {
  test('화면은 못 옮겨도 세션은 시작한다', () => {
    // 알림을 탭해 앱이 막 뜬 경우. 홈 화면의 '산책 중' 뱃지로 들어갈 수 있어야 한다.
    jest.spyOn(navigationRef, 'isReady').mockReturnValueOnce(false);

    startFromWatch(10, state([room()]));

    expect(getWalkSessionRoomId()).toBe(10);
    expect(navigate).not.toHaveBeenCalled();
  });
});
