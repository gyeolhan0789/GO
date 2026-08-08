/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useSentRoomInvitesQuery } from '../src/features/room/hooks/useSentRoomInvitesQuery';
import { CreateWalkRoomScreen } from '../src/screens/CompanionScreen/components/CreateWalkRoomScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const ROOM_ID = 12;
const FRIEND_MEMBER_ID = 2;
const FRIEND_NICKNAME = '민서';
const REQUEST_ID = 7;

const FRIEND = {
  memberId: FRIEND_MEMBER_ID,
  nickname: FRIEND_NICKNAME,
  weeklySteps: 3000,
  gender: 'FEMALE',
  defaultImageUrl: null,
  equippedItems: [],
};

/** 모달이 닫혀 있는 사이에 새로 맺어지는 친구. */
const NEW_FRIEND = {
  memberId: 3,
  nickname: '지호',
  weeklySteps: 1200,
  gender: 'MALE',
  defaultImageUrl: null,
  equippedItems: [],
};

const CREATED_ROOM = {
  roomId: ROOM_ID,
  name: '아침 산책 모임',
  mode: 'COOPERATE',
  status: 'ACTIVE',
  targetBingoCount: 4,
  targetStepCount: 10000,
  totalMissionCount: 16,
  completedMissionCount: 0,
  hostId: 1,
  startedAt: null,
  members: [],
};

const PENDING_INVITE = {
  requestId: REQUEST_ID,
  roomId: ROOM_ID,
  inviteeId: FRIEND_MEMBER_ID,
  inviteeNickname: FRIEND_NICKNAME,
  status: 'PENDING',
  createdAt: '2026-07-24T11:00:00',
};

/** 초대 대기 목록을 화면에 드러내 무효화 이후 다시 조회됐는지 보게 한다. */
function SentInvitesProbe() {
  const sentInvites = useSentRoomInvitesQuery();

  return <Text>{`초대 대기 ${sentInvites.data?.length ?? 0}`}</Text>;
}

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;
/** 서버가 들고 있는 내가 보낸 초대. 초대를 보내면 한 건 늘어난다. */
let sentInvites: (typeof PENDING_INVITE)[];
/** 서버가 들고 있는 내 친구 목록. 테스트 도중 늘려 갱신 여부를 본다. */
let friends: (typeof FRIEND)[];

beforeEach(() => {
  sentInvites = [];
  friends = [FRIEND];
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async (url, init) => {
    if (url.includes('/friends')) {
      return jsonResponse(200, { content: friends, hasNext: false } as never);
    }
    if (url.includes('/rooms/requests/sent')) {
      return jsonResponse(200, sentInvites as never);
    }
    if (url.includes(`/rooms/${ROOM_ID}/requests`) && init?.method === 'POST') {
      sentInvites = [PENDING_INVITE];
      return jsonResponse(200, {
        requestId: REQUEST_ID,
        status: 'PENDING',
        created: true,
      });
    }
    if (url.endsWith('/rooms') && init?.method === 'POST') {
      return jsonResponse(201, CREATED_ROOM);
    }
    throw new Error(`예상하지 못한 요청: ${url}`);
  });
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
  const button = root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.props.accessibilityLabel === label);

  if (!button) {
    throw new Error(`${label} 버튼을 찾지 못했다.`);
  }
  return button;
}

async function typeInto(
  root: ReactTestInstance,
  placeholder: string,
  value: string,
) {
  const input = root
    .findAllByType(TextInput)
    .find(node => node.props.placeholder === placeholder);

  if (!input) {
    throw new Error(`${placeholder} 입력창을 찾지 못했다.`);
  }
  await act(async () => {
    input.props.onChangeText(value);
  });
}

async function renderScreen({ visible = true } = {}) {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      // `QueryClient.clear()`는 mutation의 gc 타이머를 정리하지 않는다. 언마운트
      // 때 걸리는 기본 5분 타이머를 0으로 줄여 워커가 매달려 있지 않게 한다.
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const client = queryClient;
  const onCreated = jest.fn();
  const onOpenCreatedRoom = jest.fn();

  // 동행 탭이 그러듯 화면을 언마운트하지 않고 visible만 껐다 켠다.
  const treeFor = (isVisible: boolean) => (
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <SentInvitesProbe />
        <CreateWalkRoomScreen
          visible={isVisible}
          onClose={jest.fn()}
          onCreated={onCreated}
          onOpenCreatedRoom={onOpenCreatedRoom}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );

  await act(async () => {
    renderer = ReactTestRenderer.create(treeFor(visible));
  });

  await flushQueries();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }

  const setVisible = async (isVisible: boolean) => {
    await act(async () => {
      renderer?.update(treeFor(isVisible));
    });
    await flushQueries();
  };

  return { tree: renderer, onCreated, onOpenCreatedRoom, setVisible };
}

/** 초대 목록에 뜬 친구 줄. 안 떴으면 undefined다. */
function findFriendRow(root: ReactTestInstance, nickname: string) {
  return root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.props.accessibilityLabel === `${nickname} 초대`);
}

/** 1단계(방 정보)를 채우고 2단계(친구 선택)로 넘어간다. */
async function goToFriendStep(root: ReactTestInstance) {
  await typeInto(root, '산책방 이름을 입력하세요', '아침 산책 모임');
  await typeInto(root, '이번 주 합계 (예: 10000)', '10000');
  await act(async () => {
    findButtonByLabel(root, '다음').props.onPress();
  });
}

/** 1단계(방 정보)를 채우고 2단계(친구 선택)에서 친구 한 명을 고른다. */
async function fillFormAndSelectFriend(root: ReactTestInstance) {
  await goToFriendStep(root);
  await act(async () => {
    findButtonByLabel(root, `${FRIEND_NICKNAME} 초대`).props.onPress();
  });
}

/** 폼을 채우고 만들기까지 눌러 완료 모달을 띄운다. */
async function createRoom(root: ReactTestInstance) {
  await fillFormAndSelectFriend(root);
  await act(async () => {
    findButtonByLabel(root, '산책방 만들기').props.onPress();
  });
  await flushQueries();
}

describe('CreateWalkRoomScreen', () => {
  test('고른 친구에게 방 초대를 보낸다', async () => {
    const { tree } = await renderScreen();

    await createRoom(tree.root);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/rooms/${ROOM_ID}/requests`),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ inviteeId: FRIEND_MEMBER_ID }),
      }),
    );
  });

  test('만들고 나면 완료를 알리고 방으로 갈 길을 준다', async () => {
    // 예전에는 곧바로 화면을 닫고 토스트만 띄워서, 방을 보려면 목록에서 다시 찾아야 했다.
    const { tree, onCreated, onOpenCreatedRoom } = await renderScreen();

    await createRoom(tree.root);

    expect(collectTexts(tree.root)).toContain('산책방이 만들어졌어요!');
    expect(collectTexts(tree.root)).toContain(CREATED_ROOM.name);
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenCreatedRoom).not.toHaveBeenCalled();
  });

  test('보러가기를 누르면 만든 방으로 보낸다', async () => {
    const { tree, onCreated, onOpenCreatedRoom } = await renderScreen();

    await createRoom(tree.root);
    await act(async () => {
      findButtonByLabel(tree.root, '보러가기').props.onPress();
    });

    expect(onOpenCreatedRoom).toHaveBeenCalledWith(ROOM_ID);
    expect(onCreated).not.toHaveBeenCalled();
  });

  test('닫기를 누르면 목록으로 돌아간다', async () => {
    const { tree, onCreated, onOpenCreatedRoom } = await renderScreen();

    await createRoom(tree.root);
    await act(async () => {
      findButtonByLabel(tree.root, '닫기').props.onPress();
    });

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onOpenCreatedRoom).not.toHaveBeenCalled();
  });

  test('다시 열면 완료 모달이 남아 있지 않다', async () => {
    // 폼과 함께 초기화하지 않으면 방을 만든 적 있는 사용자에게 열자마자 모달이 뜬다.
    const { tree, setVisible } = await renderScreen();

    await createRoom(tree.root);
    await act(async () => {
      findButtonByLabel(tree.root, '닫기').props.onPress();
    });
    await setVisible(false);
    await setVisible(true);

    expect(collectTexts(tree.root)).not.toContain('산책방이 만들어졌어요!');
  });

  test('초대를 보내면 초대 대기 목록 캐시를 무효화한다', async () => {
    const { tree } = await renderScreen();

    expect(collectTexts(tree.root)).toContain('초대 대기 0');

    await createRoom(tree.root);
    await flushQueries();

    // 무효화하지 않으면 방장이 방 상세에 들어가도 방금 보낸 초대가 안 보인다.
    expect(collectTexts(tree.root)).toContain('초대 대기 1');
  });

  test('닫혀 있는 동안에는 친구 목록을 읽지 않는다', async () => {
    await renderScreen({ visible: false });

    const friendCalls = fetchMock.mock.calls.filter(([url]) =>
      url.includes('/friends'),
    );
    expect(friendCalls).toHaveLength(0);
  });

  test('다시 열면 친구 목록을 새로 읽는다', async () => {
    const { tree, setVisible } = await renderScreen();

    await goToFriendStep(tree.root);
    expect(findFriendRow(tree.root, NEW_FRIEND.nickname)).toBeUndefined();

    // 닫혀 있는 사이 상대가 내 친구 요청을 수락했다. 내 쪽에는 알림이 없다.
    await setVisible(false);
    friends = [FRIEND, NEW_FRIEND];
    await setVisible(true);

    // 다시 읽지 않으면 새로 맺은 친구를 방에 초대할 방법이 없다.
    expect(findFriendRow(tree.root, NEW_FRIEND.nickname)).toBeDefined();
  });
});
