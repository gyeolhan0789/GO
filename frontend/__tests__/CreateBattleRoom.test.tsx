/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CreateWalkRoomScreen } from '../src/screens/CompanionScreen/components/CreateWalkRoomScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

const FRIEND = { memberId: 42, nickname: '민서' };
const ROOM_ID = 7;

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;
let createRoomBodies: Record<string, unknown>[] = [];
let invitedIds: number[] = [];

beforeEach(() => {
  createRoomBodies = [];
  invitedIds = [];
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async (url, options) => {
    const body = options?.body ? JSON.parse(String(options.body)) : {};

    if (url.includes('/friends')) {
      return jsonResponse(200, { content: [FRIEND], hasNext: false });
    }
    if (url.includes('/requests')) {
      invitedIds.push(Number(body.inviteeId));
      return jsonResponse(200, { requestId: 1, status: 'PENDING', created: true });
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

async function renderScreen() {
  queryClient = new QueryClient({
    // gcTime을 남겨 두면 방 생성·초대 뮤테이션이 끝난 뒤에도 정리 타이머가
    // 살아남아 jest 워커가 안 죽는다.
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  const client = queryClient;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <CreateWalkRoomScreen visible onClose={() => {}} onCreated={() => {}} />
      </QueryClientProvider>,
    );
  });
  await flush();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
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

/** accessibilityLabel로 누를 수 있는 요소를 찾아 누른다. */
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

function typeInto(root: ReactTestInstance, placeholder: string, value: string) {
  const [input] = root.findAll(node => node.props.placeholder === placeholder);
  if (!input) {
    throw new Error(`'${placeholder}' 입력란을 찾지 못했다.`);
  }
  act(() => {
    input.props.onChangeText(value);
  });
}

describe('대결방 만들기', () => {
  test('대결을 고르면 걸음수 대신 목표 빙고 줄 수를 묻는다', async () => {
    const tree = await renderScreen();
    await selectOption(tree.root, '대결');

    const placeholders = tree.root
      .findAll(node => typeof node.props.placeholder === 'string')
      .map(node => node.props.placeholder);

    // 대결에는 targetStepCount를 보내면 서버가 400으로 막는다.
    expect(placeholders).not.toContain('일주일 기준 목표 걸음수 (예: 10000)');
    expect(placeholders).toContain('1 ~ 10');
  });

  test('걸음수 없이 목표 줄 수만 실어 보낸다', async () => {
    const tree = await renderScreen();
    await selectOption(tree.root, '대결');
    typeInto(tree.root, '산책방 이름을 입력하세요', '한판 붙자');
    typeInto(tree.root, '1 ~ 10', '3');

    await press(tree.root, '다음');
    await selectOption(tree.root, '민서');
    await press(tree.root, '산책방 만들기');

    expect(createRoomBodies[0]).toEqual({
      name: '한판 붙자',
      mode: 'BATTLE',
      boardSize: 4,
      targetBingoCount: 3,
    });
    expect(createRoomBodies[0]).not.toHaveProperty('targetStepCount');
    expect(invitedIds).toEqual([FRIEND.memberId]);
  });

  test('판에서 나올 수 없는 줄 수는 서버에 보내지 않는다', async () => {
    // 4x4는 가로 4 + 세로 4 + 대각선 2 = 최대 10줄이다.
    const tree = await renderScreen();
    await selectOption(tree.root, '대결');
    typeInto(tree.root, '산책방 이름을 입력하세요', '한판 붙자');
    typeInto(tree.root, '1 ~ 10', '11');

    await press(tree.root, '다음');

    expect(Alert.alert).toHaveBeenCalledWith(
      '목표 빙고 줄 수를 확인해주세요.',
      expect.stringContaining('10줄'),
    );
    expect(createRoomBodies).toHaveLength(0);
  });

  test('상대를 안 고르면 방을 만들지 않는다', async () => {
    const tree = await renderScreen();
    await selectOption(tree.root, '대결');
    typeInto(tree.root, '산책방 이름을 입력하세요', '한판 붙자');
    typeInto(tree.root, '1 ~ 10', '3');

    await press(tree.root, '다음');
    await press(tree.root, '산책방 만들기');

    expect(Alert.alert).toHaveBeenCalledWith('대결할 친구를 한 명 선택해주세요.');
    expect(createRoomBodies).toHaveLength(0);
  });

  test('함께 걷기는 그대로 걸음수를 보낸다', async () => {
    const tree = await renderScreen();
    typeInto(tree.root, '산책방 이름을 입력하세요', '동네 한바퀴');
    typeInto(tree.root, '일주일 기준 목표 걸음수 (예: 10000)', '10000');

    await press(tree.root, '다음');
    await selectOption(tree.root, '민서');
    await press(tree.root, '산책방 만들기');

    expect(createRoomBodies[0]).toMatchObject({
      mode: 'COOPERATE',
      targetStepCount: 10000,
    });
  });
});
