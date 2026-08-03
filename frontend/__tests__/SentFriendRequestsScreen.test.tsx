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
import { SentFriendRequestsScreen } from '../src/screens/SentFriendRequestsScreen/SentFriendRequestsScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const REQUEST_ID = 7;
const INVITEE_NICKNAME = '느긋한거북';

const SENT_REQUESTS = {
  content: [
    {
      requestId: REQUEST_ID,
      inviteeId: 42,
      inviteeNickname: INVITEE_NICKNAME,
      createdAt: '2026-08-01T09:30:00',
    },
  ],
  hasNext: false,
};

const EMPTY_SLICE = { content: [], hasNext: false };

const Stack = createNativeStackNavigator<RootStackParamList>();

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async url => {
    if (url.includes('/friend-requests/sent')) {
      return jsonResponse(200, SENT_REQUESTS);
    }
    if (url.includes('/friend-requests/')) {
      return jsonResponse(204);
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

/**
 * Text 하나가 그리는 글자를 한 줄로 모은다. `{count}` 같은 보간이 섞이면 children이
 * 조각으로 쪼개져 오므로, 화면에 보이는 그대로 비교하려면 다시 이어붙여야 한다.
 */
function collectTexts(root: ReactTestInstance): string[] {
  return root.findAllByType(Text).map(node => {
    const children = node.props.children;
    return (Array.isArray(children) ? children : [children])
      .filter(
        (child): child is string | number =>
          typeof child === 'string' || typeof child === 'number',
      )
      .join('');
  });
}

function findButtonByLabel(root: ReactTestInstance, label: string) {
  return root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.props.accessibilityLabel === label);
}

async function renderScreen() {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      // `QueryClient.clear()`는 mutation의 gc 타이머를 정리하지 않는다. 언마운트
      // 때 걸리는 기본 5분 타이머를 0으로 줄여 워커가 매달려 있지 않게 한다.
      mutations: { retry: false, gcTime: 0 },
    },
  });
  const client = queryClient;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen
                name="SentFriendRequests"
                component={SentFriendRequestsScreen}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>,
    );
  });

  await flushQueries();

  if (!renderer) {
    throw new Error('renderer not initialized');
  }
  return renderer;
}

const CANCEL_LABEL = `${INVITEE_NICKNAME}님에게 보낸 친구 요청 취소`;

describe('SentFriendRequestsScreen', () => {
  test('보낸 요청의 상대 닉네임과 보낸 날짜를 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain(INVITEE_NICKNAME);
    // 서버 LocalDateTime을 기기 시간대로 옮기지 않고 날짜만 떼어 보여준다.
    expect(texts).toContain('2026.08.01 요청');
    expect(texts).toContain('보낸 요청 1');
  });

  test('요청 취소를 확인받고 취소 요청을 보낸다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const tree = await renderScreen();

    const cancelButton = findButtonByLabel(tree.root, CANCEL_LABEL);
    expect(cancelButton).toBeDefined();
    await act(async () => {
      cancelButton?.props.onPress();
    });

    const [, , buttons] = alertSpy.mock.calls[0];
    const confirm = buttons?.find(button => button.text === '요청 취소');
    await act(async () => {
      confirm?.onPress?.();
    });
    await flushQueries();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/friend-requests/${REQUEST_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  test('확인창에서 닫으면 취소 요청을 보내지 않는다', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const tree = await renderScreen();

    await act(async () => {
      findButtonByLabel(tree.root, CANCEL_LABEL)?.props.onPress();
    });
    await flushQueries();

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  test('그사이 상대가 응답해 취소가 실패하면 알리고 목록을 다시 읽는다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const conflictMessage = '이미 처리된 친구 요청입니다.';
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === 'DELETE') {
        return jsonResponse(409, { message: conflictMessage });
      }
      if (url.includes('/friend-requests/sent')) {
        return jsonResponse(200, SENT_REQUESTS);
      }
      throw new Error(`예상하지 못한 요청: ${url}`);
    });
    const tree = await renderScreen();
    const requestCountBeforeCancel = fetchMock.mock.calls.length;

    await act(async () => {
      findButtonByLabel(tree.root, CANCEL_LABEL)?.props.onPress();
    });
    const [, , buttons] = alertSpy.mock.calls[0];
    await act(async () => {
      buttons?.find(button => button.text === '요청 취소')?.onPress?.();
    });
    await flushQueries();

    expect(alertSpy).toHaveBeenCalledWith(
      '친구 요청 취소 실패',
      conflictMessage,
    );
    // DELETE 한 번 + 목록 재조회 한 번.
    expect(fetchMock.mock.calls.length).toBe(requestCountBeforeCancel + 2);
  });

  test('보낸 요청이 없으면 친구를 추가할 곳을 안내한다', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, EMPTY_SLICE));
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts.some(text => text.includes('보낸 친구 요청이 없어요.'))).toBe(
      true,
    );
    // 개수 라벨은 0을 보여줄 이유가 없어 비운다.
    expect(texts).not.toContain('보낸 요청 0');
  });

  test('목록을 불러오지 못하면 다시 시도할 수 있게 안내한다', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(500, { message: '서버 오류' }),
    );
    const tree = await renderScreen();

    expect(
      findButtonByLabel(tree.root, '친구 추가 내역 다시 불러오기'),
    ).toBeDefined();
  });
});
