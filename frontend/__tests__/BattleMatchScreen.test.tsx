/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BattleMatchScreen } from '../src/screens/HomeScreen/components/BattleMatchScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

const FRIEND = { memberId: 42, nickname: '민서', equippedItems: [] };
const ROOM_ID = 7;

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;
let createRoomBodies: Record<string, unknown>[] = [];
let invitedIds: number[] = [];
let invitedRoomIds: number[] = [];

beforeEach(() => {
  createRoomBodies = [];
  invitedIds = [];
  invitedRoomIds = [];
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async (url, options) => {
    const body = options?.body ? JSON.parse(String(options.body)) : {};

    if (url.includes('/friends')) {
      return jsonResponse(200, { content: [FRIEND], hasNext: false });
    }
    // 초대는 /rooms/{id}/requests 라서 /rooms 검사보다 먼저 걸러야 한다.
    if (url.includes('/requests')) {
      invitedRoomIds.push(Number(/\/rooms\/(\d+)\//.exec(url)?.[1]));
      invitedIds.push(Number(body.inviteeId));
      return jsonResponse(200, {
        requestId: 1,
        status: 'PENDING',
        created: true,
      });
    }
    if (url.includes('/rooms')) {
      createRoomBodies.push(body);
      return jsonResponse(200, { roomId: ROOM_ID, name: body.name });
    }
    throw new Error(`예상하지 못한 요청: ${url}`);
  });
});

afterEach(() => {
  if (renderer) {
    act(() => renderer?.unmount());
    renderer = null;
  }
  queryClient?.clear();
  queryClient = null;
  jest.restoreAllMocks();
});

async function flush() {
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
}

const invitedRooms: number[] = [];

async function renderSheet() {
  invitedRooms.length = 0;
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  const client = queryClient;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      // BottomSheet가 안전 영역 여백을 읽어서 Provider 없이는 렌더가 죽는다.
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <QueryClientProvider client={client}>
          <BattleMatchScreen
            visible
            onClose={() => {}}
            onInvited={roomId => invitedRooms.push(roomId)}
          />
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
  });
  await flush();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer.root;
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

async function press(root: ReactTestInstance, label: string) {
  const [target] = root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );
  if (!target) {
    throw new Error(`'${label}'을(를) 누를 수 없다.`);
  }
  await act(async () => {
    target.props.onPress();
  });
  await flush();
}

/** SegmentedControl은 옵션 라벨을 가진 Pressable로 그려진다. */
async function selectOption(root: ReactTestInstance, label: string) {
  const [option] = root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      collectTexts(node).includes(label),
  );
  if (!option) {
    throw new Error(`'${label}' 옵션을 찾지 못했다.`);
  }
  await act(async () => {
    option.props.onPress();
  });
  await flush();
}

function typeGoal(root: ReactTestInstance, value: string) {
  const [input] = root.findAll(
    node => typeof node.props.onChangeText === 'function',
  );
  act(() => {
    input.props.onChangeText(value);
  });
}

async function sendBattle(root: ReactTestInstance) {
  const [button] = root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      typeof node.props.disabled === 'boolean' &&
      collectTexts(node).includes('대결 신청'),
  );
  if (!button) {
    throw new Error('대결 신청 버튼을 찾지 못했다.');
  }
  await act(async () => {
    button.props.onPress();
  });
  await flush();
}

describe('대결 신청 화면', () => {
  test('친구 목록을 보여준다', async () => {
    const root = await renderSheet();

    expect(collectTexts(root)).toContain('민서');
  });

  test('상대를 고르고 신청하면 BATTLE 방을 만들고 초대까지 보낸다', async () => {
    const root = await renderSheet();

    await press(root, '민서과 대결');
    typeGoal(root, '2');
    await sendBattle(root);

    expect(createRoomBodies[0]).toMatchObject({
      mode: 'BATTLE',
      boardSize: 3,
      targetBingoCount: 2,
    });
    expect(invitedIds).toEqual([FRIEND.memberId]);
    expect(invitedRoomIds).toEqual([ROOM_ID]);
  });

  test('대결에는 걸음수 목표를 싣지 않는다', async () => {
    const root = await renderSheet();

    await press(root, '민서과 대결');
    typeGoal(root, '1');
    await sendBattle(root);

    // 서버가 대결에 targetStepCount가 오면 400으로 막는다.
    expect(createRoomBodies[0]).not.toHaveProperty('targetStepCount');
  });

  test('신청이 끝나면 그 방으로 보낸다', async () => {
    const root = await renderSheet();

    await press(root, '민서과 대결');
    typeGoal(root, '1');
    await sendBattle(root);

    expect(invitedRooms).toEqual([ROOM_ID]);
  });

  test('판에서 나올 수 없는 줄 수는 서버에 보내지 않는다', async () => {
    const root = await renderSheet();

    await press(root, '민서과 대결');
    // 3x3의 상한은 가로 3 + 세로 3 + 대각선 2 = 8줄.
    typeGoal(root, '9');
    await sendBattle(root);

    expect(createRoomBodies).toHaveLength(0);
    expect(Alert.alert).toHaveBeenCalled();
  });

  test('판 크기를 키우면 상한도 올라간다', async () => {
    const root = await renderSheet();

    await press(root, '민서과 대결');
    await selectOption(root, '5 x 5');
    typeGoal(root, '9');
    await sendBattle(root);

    expect(createRoomBodies[0]).toMatchObject({
      boardSize: 5,
      targetBingoCount: 9,
    });
  });

  test('상대를 안 고르면 아무것도 보내지 않는다', async () => {
    const root = await renderSheet();

    typeGoal(root, '1');
    await sendBattle(root);

    expect(createRoomBodies).toHaveLength(0);
    expect(invitedIds).toHaveLength(0);
  });
});
