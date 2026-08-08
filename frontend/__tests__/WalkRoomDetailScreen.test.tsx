/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { RootStackParamList } from '../src/app/navigation/RootNavigator';
import { BingoCell } from '../src/features/bingo/components/BingoCell/BingoCell';
import { WalkRoomDetailScreen } from '../src/screens/WalkRoomDetailScreen/WalkRoomDetailScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';
import { MY_CHARACTER_RESPONSE, MY_MEMBER_ID } from '../jest/walkSessionFixtures';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const ROOM_ID = 12;
const FRIEND_MEMBER_ID = 2;

function buildRoomDetailResponse({
  hostId = MY_MEMBER_ID,
  status = 'ACTIVE',
}: { hostId?: number; status?: string } = {}) {
  return {
    roomId: ROOM_ID,
    name: '아침 산책 모임',
    mode: 'COOPERATE',
    status,
    targetBingoCount: 3,
    targetStepCount: 10000,
    totalMissionCount: 9,
    completedMissionCount: 3,
    hostId,
    startedAt: '2026-07-24T10:05:00',
    members: [
      {
        memberId: MY_MEMBER_ID,
        nickname: '걷는곰',
        host: hostId === MY_MEMBER_ID,
        completedMissionCount: 2,
        joinedAt: '2026-07-24T10:00:00',
        bingoBoardId: null,
      },
      {
        memberId: FRIEND_MEMBER_ID,
        nickname: '민서',
        host: hostId === FRIEND_MEMBER_ID,
        completedMissionCount: 1,
        joinedAt: '2026-07-24T10:01:00',
        bingoBoardId: null,
      },
    ],
  };
}

function buildBoardResponse() {
  const cells = Array.from({ length: 9 }, (_, index) => {
    // 내가 2칸, 친구가 1칸 깬 3x3 판.
    const submittedBy =
      index < 2 ? MY_MEMBER_ID : index === 2 ? FRIEND_MEMBER_ID : null;

    return {
      cellId: 100 + index,
      row: Math.floor(index / 3),
      col: index % 3,
      mission: {
        missionId: 10 + index,
        missionImageUrl: null,
        type: 'OBJECT',
        title: `미션 ${index + 1}`,
        detail: '',
        decisionCondition: '',
        point: 30,
      },
      verificationStatus: submittedBy === null ? 'PENDING' : 'APPROVED',
      submittedByMemberId: submittedBy,
      rejectionReason: null,
    };
  });

  return {
    bingoBoardId: 1,
    roomId: ROOM_ID,
    boardSize: 3,
    targetStepCount: 10000,
    completedBingoCount: 0,
    totalCellCount: 9,
    approvedCellCount: 3,
    cells,
    completed: false,
    canRenew: false,
    renewalRequired: false,
    renewalMessage: null,
  };
}

const SENT_INVITES = [
  {
    requestId: 7,
    roomId: ROOM_ID,
    inviteeId: 4,
    inviteeNickname: '민지',
    status: 'PENDING',
    createdAt: '2026-07-24T11:00:00',
  },
  // 다른 방으로 보낸 초대는 이 화면에 나오면 안 된다.
  {
    requestId: 8,
    roomId: 99,
    inviteeId: 5,
    inviteeNickname: '다른방친구',
    status: 'PENDING',
    createdAt: '2026-07-24T11:00:00',
  },
];

const Stack = createNativeStackNavigator<RootStackParamList>();

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

function mockHappyPath({
  hostId = MY_MEMBER_ID,
  roomStatus = 'ACTIVE',
}: { hostId?: number; roomStatus?: string } = {}) {
  fetchMock.mockImplementation(async (url, init) => {
    if (url.includes('/members/avatar')) {
      return jsonResponse(200, MY_CHARACTER_RESPONSE);
    }
    if (url.includes('/bingo-boards/active')) {
      return jsonResponse(200, buildBoardResponse());
    }
    if (url.includes('/rooms/requests/sent')) {
      return jsonResponse(200, SENT_INVITES as never);
    }
    if (url.includes('/requests/') && init?.method === 'PATCH') {
      return jsonResponse(204, null);
    }
    if (init?.method === 'DELETE') {
      return jsonResponse(204, null);
    }
    if (url.endsWith(`/rooms/${ROOM_ID}`)) {
      return jsonResponse(
        200,
        buildRoomDetailResponse({ hostId, status: roomStatus }),
      );
    }
    throw new Error(`예상하지 못한 요청: ${url}`);
  });
}

beforeEach(() => {
  fetchMock = installFetchMock();
  mockHappyPath();
});

afterEach(() => {
  jest.restoreAllMocks();
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
  // 안 비우면 react-query gc 타이머가 살아남아 워커가 안 죽는다.
  queryClient?.clear();
  queryClient = null;
});

/** react-query는 알림을 setTimeout으로 모아 보내서 타이머까지 흘려보내야 한다. */
async function flushQueries() {
  await act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
  });
}

function collectTexts(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .flatMap(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children : [children];
    })
    .filter((child): child is string => typeof child === 'string');
}

function findButtonByLabel(root: ReactTestInstance, label: string) {
  return root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.props.accessibilityLabel === label);
}

async function renderScreen() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const client = queryClient;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen
                name="WalkRoomDetail"
                component={WalkRoomDetailScreen}
                initialParams={{ roomId: ROOM_ID }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>,
    );
  });

  await flushQueries();
  await flushQueries();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

describe('WalkRoomDetailScreen', () => {
  test('방 이름과 공동 목표를 요약해 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('아침 산책 모임');
    expect(texts).toContain('협동');
    expect(texts).toContain('진행 중');
    // 주간 누적 목표라 '이번 주'를 붙여 하루치로 읽히지 않게 한다.
    expect(texts).toContain('이번 주 목표 걸음 수');
    expect(texts).toContain('빙고 미션');
    expect(texts).toContain('3/9');
  });

  test('들어와 있는 친구를 방장 표시와 함께 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('참여 중인 친구 2');
    expect(texts).toContain('나');
    expect(texts).toContain('민서');
    expect(texts).toContain('방장');
  });

  test('방장에게는 이 방으로 보낸 초대만 수락 대기로 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('수락 대기 중 1');
    expect(texts).toContain('민지');
    expect(texts).not.toContain('다른방친구');
  });

  test('방장이 아니면 초대 대기 목록을 보여주지 않는다', async () => {
    mockHappyPath({ hostId: FRIEND_MEMBER_ID });
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    // 누굴 초대했는지는 방장의 관심사다. 팀원 화면에는 참여자만 남긴다.
    expect(texts).not.toContain('수락 대기 중 1');
    expect(texts).not.toContain('민지');
  });

  test('초대 취소를 확인받고 취소 요청을 보낸다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const tree = await renderScreen();

    const cancelButton = findButtonByLabel(tree.root, '민지 초대 취소');
    expect(cancelButton).toBeDefined();
    await act(async () => {
      cancelButton?.props.onPress();
    });

    const [, , buttons] = alertSpy.mock.calls[0];
    const confirm = buttons?.find(button => button.text === '초대 취소');
    await act(async () => {
      confirm?.onPress?.();
    });
    await flushQueries();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/rooms/${ROOM_ID}/requests/7/cancel`),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  test('진행 중인 빙고판을 보여준다 (미션 인증은 산책 중에만 하므로 여기서는 보기만 한다)', async () => {
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain('빙고판 3/9');
    expect(tree.root.findAllByType(BingoCell)).toHaveLength(9);
    expect(findButtonByLabel(tree.root, '빙고판 자세히 보기')).toBeUndefined();
  });

  test('아직 빙고판이 없으면 안내만 보여준다', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (url.includes('/members/avatar')) {
        return jsonResponse(200, MY_CHARACTER_RESPONSE);
      }
      if (url.includes('/bingo-boards/active')) {
        return jsonResponse(404, { message: '빙고판을 찾을 수 없습니다.' });
      }
      if (url.includes('/rooms/requests/sent')) {
        return jsonResponse(200, [] as never);
      }
      if (url.endsWith(`/rooms/${ROOM_ID}`) && init?.method !== 'DELETE') {
        return jsonResponse(200, buildRoomDetailResponse());
      }
      throw new Error(`예상하지 못한 요청: ${url}`);
    });
    const tree = await renderScreen();

    expect(collectTexts(tree.root)).toContain('아직 진행 중인 빙고판이 없어요.');
  });

  test('방장에게는 삭제 버튼만 보인다', async () => {
    const tree = await renderScreen();

    expect(findButtonByLabel(tree.root, '모임 삭제')).toBeDefined();
    expect(findButtonByLabel(tree.root, '모임 나가기')).toBeUndefined();
  });

  test('방장이 아니면 나가기 버튼만 보인다', async () => {
    mockHappyPath({ hostId: FRIEND_MEMBER_ID });
    const tree = await renderScreen();

    expect(findButtonByLabel(tree.root, '모임 나가기')).toBeDefined();
    expect(findButtonByLabel(tree.root, '모임 삭제')).toBeUndefined();
  });

  test('방장이 삭제를 확인하면 삭제 요청을 보낸다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const tree = await renderScreen();

    await act(async () => {
      findButtonByLabel(tree.root, '모임 삭제')?.props.onPress();
    });

    const [, , buttons] = alertSpy.mock.calls[0];
    const confirm = buttons?.find(button => button.text === '삭제');
    await act(async () => {
      confirm?.onPress?.();
    });
    await flushQueries();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/rooms/${ROOM_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  test('종료된 방에는 나가기·삭제 버튼을 보여주지 않는다', async () => {
    mockHappyPath({ roomStatus: 'CLOSED' });
    const tree = await renderScreen();

    expect(findButtonByLabel(tree.root, '모임 삭제')).toBeUndefined();
    expect(findButtonByLabel(tree.root, '모임 나가기')).toBeUndefined();
  });

  test('모임 정보를 불러오지 못하면 오류를 알린다', async () => {
    fetchMock.mockImplementation(async url =>
      url.includes('/members/avatar')
        ? jsonResponse(200, MY_CHARACTER_RESPONSE)
        : jsonResponse(500, null),
    );
    const tree = await renderScreen();

    // {'\n'}으로 이어 붙인 문장이라 children이 조각나 앞부분만 확인한다.
    expect(collectTexts(tree.root)).toContain('모임 정보를 불러오지 못했어요.');
  });
});
