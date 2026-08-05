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
import { FriendRequestsScreen } from '../src/screens/FriendRequestsScreen/FriendRequestsScreen';
import { installFetchMock, jsonResponse } from '../jest/fetchMock';
import type { FetchMock } from '../jest/fetchMock';

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 400, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const RECEIVED_REQUEST_ID = 5;
const INVITER_NICKNAME = '느긋한너구리';

const RECEIVED_REQUESTS = {
  content: [
    {
      requestId: RECEIVED_REQUEST_ID,
      inviterId: 10,
      inviterNickname: INVITER_NICKNAME,
      createdAt: '2026-08-01T09:00:00',
    },
  ],
  hasNext: false,
};

const SENT_REQUEST_ID = 7;
const INVITEE_NICKNAME = '느긋한거북';

const SENT_REQUESTS = {
  content: [
    {
      requestId: SENT_REQUEST_ID,
      inviteeId: 42,
      inviteeNickname: INVITEE_NICKNAME,
      createdAt: '2026-08-01T09:30:00',
    },
  ],
  hasNext: false,
};

// 보낸 요청 응답에 아바타가 없어 훅이 회원 검색으로 채워 넣는다(useSentRequestsQuery).
const INVITEE_SEARCH = {
  content: [
    {
      memberId: 42,
      nickname: INVITEE_NICKNAME,
      relationshipStatus: 'REQUEST_SENT',
      gender: 'FEMALE',
      defaultImageUrl: null,
      equippedItems: [],
    },
  ],
  hasNext: false,
};

const EMPTY_SLICE = { content: [], hasNext: false };

const Stack = createNativeStackNavigator<RootStackParamList>();

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
let queryClient: QueryClient | null = null;
let fetchMock: FetchMock;

function defaultFetchImplementation(url: string, init?: RequestInit) {
  if (url.includes('/friend-requests/sent')) {
    return jsonResponse(200, SENT_REQUESTS);
  }
  if (url.includes('/friend-requests/') && url.includes('/accept')) {
    return jsonResponse(204);
  }
  if (url.includes('/friend-requests/') && url.includes('/reject')) {
    return jsonResponse(204);
  }
  if (url.includes('/friend-requests/') && init?.method === 'DELETE') {
    return jsonResponse(204);
  }
  if (url.includes('/friend-requests')) {
    return jsonResponse(200, RECEIVED_REQUESTS);
  }
  if (url.includes('/members/search')) {
    return jsonResponse(200, INVITEE_SEARCH as never);
  }
  throw new Error(`예상하지 못한 요청: ${url}`);
}

beforeEach(() => {
  fetchMock = installFetchMock();
  fetchMock.mockImplementation(async (url, init) =>
    defaultFetchImplementation(url, init),
  );
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

/** SegmentedControl 탭처럼 접근성 라벨 없이 자식 Text로만 구분되는 버튼을 찾는다. */
function findButtonByText(root: ReactTestInstance, text: string) {
  let current: ReactTestInstance | null = root.find(
    node => node.type === Text && node.props.children === text,
  ).parent;

  while (current) {
    if (typeof current.props.onPress === 'function') {
      return current;
    }
    current = current.parent;
  }

  throw new Error(`${text} 버튼을 찾지 못했다.`);
}

/** 개수가 붙어 매 테스트마다 달라지는 "보낸 요청 N" 탭을 접두어로 찾는다. */
function findButtonByTextPrefix(root: ReactTestInstance, prefix: string) {
  let current: ReactTestInstance | null = root.find(
    node =>
      node.type === Text &&
      typeof node.props.children === 'string' &&
      node.props.children.startsWith(prefix),
  ).parent;

  while (current) {
    if (typeof current.props.onPress === 'function') {
      return current;
    }
    current = current.parent;
  }

  throw new Error(`${prefix}로 시작하는 버튼을 찾지 못했다.`);
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
                name="FriendRequests"
                component={FriendRequestsScreen}
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

async function goToSentTab(root: ReactTestInstance) {
  await act(async () => {
    findButtonByTextPrefix(root, '보낸 요청 ').props.onPress();
  });
}

const CANCEL_LABEL = `${INVITEE_NICKNAME}님에게 보낸 친구 요청 취소`;

describe('FriendRequestsScreen', () => {
  test('받은 요청과 보낸 요청 개수를 탭 라벨에 보여준다', async () => {
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('받은 요청 1');
    expect(texts).toContain('보낸 요청 1');
    expect(texts).toContain(INVITER_NICKNAME);
  });

  test('받은 요청을 수락하면 성공 토스트를 보여준다', async () => {
    const tree = await renderScreen();

    await act(async () => {
      findButtonByText(tree.root, '수락').props.onPress();
    });
    await flushQueries();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `/friend-requests/${RECEIVED_REQUEST_ID}/accept`,
      ),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(collectTexts(tree.root)).toContain('친구 요청을 수락했어요.');
  });

  test('받은 요청 거절을 확인받고 거절 요청을 보낸다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const tree = await renderScreen();

    await act(async () => {
      findButtonByText(tree.root, '거절').props.onPress();
    });

    const [, , buttons] = alertSpy.mock.calls[0];
    const confirm = buttons?.find(button => button.text === '거절');
    await act(async () => {
      confirm?.onPress?.();
    });
    await flushQueries();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `/friend-requests/${RECEIVED_REQUEST_ID}/reject`,
      ),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  test('확인창에서 닫으면 거절 요청을 보내지 않는다', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const tree = await renderScreen();

    await act(async () => {
      findButtonByText(tree.root, '거절').props.onPress();
    });
    await flushQueries();

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/reject'),
      expect.anything(),
    );
  });

  test('받은 친구 요청이 없으면 안내한다', async () => {
    fetchMock.mockImplementation(async url => {
      if (url.includes('/friend-requests/sent')) {
        return jsonResponse(200, SENT_REQUESTS);
      }
      if (url.includes('/friend-requests')) {
        return jsonResponse(200, EMPTY_SLICE);
      }
      if (url.includes('/members/search')) {
        return jsonResponse(200, INVITEE_SEARCH as never);
      }
      throw new Error(`예상하지 못한 요청: ${url}`);
    });
    const tree = await renderScreen();
    const texts = collectTexts(tree.root);

    expect(texts).toContain('받은 친구 요청이 없어요.');
    expect(texts).toContain('받은 요청 0');
  });

  test('보낸 요청 탭에서 상대 닉네임과 보낸 날짜를 보여준다', async () => {
    const tree = await renderScreen();
    await goToSentTab(tree.root);

    const texts = collectTexts(tree.root);
    expect(texts).toContain(INVITEE_NICKNAME);
    // 서버 LocalDateTime을 기기 시간대로 옮기지 않고 날짜만 떼어 보여준다.
    expect(texts).toContain('2026.08.01 요청');
  });

  test('보낸 요청 취소를 확인받고 취소 요청을 보낸다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const tree = await renderScreen();
    await goToSentTab(tree.root);

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
      expect.stringContaining(`/friend-requests/${SENT_REQUEST_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  test('확인창에서 닫으면 취소 요청을 보내지 않는다', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const tree = await renderScreen();
    await goToSentTab(tree.root);

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
      return defaultFetchImplementation(url, init);
    });
    const tree = await renderScreen();
    await goToSentTab(tree.root);
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
    // DELETE 한 번 + 목록 재조회 한 번 + 아바타 채우기용 회원 검색 한 번.
    expect(fetchMock.mock.calls.length).toBe(requestCountBeforeCancel + 3);
  });

  test('보낸 친구 요청이 없으면 친구를 추가할 곳을 안내한다', async () => {
    fetchMock.mockImplementation(async (url, init) => {
      if (url.includes('/friend-requests/sent')) {
        return jsonResponse(200, EMPTY_SLICE);
      }
      return defaultFetchImplementation(url, init);
    });
    const tree = await renderScreen();
    await goToSentTab(tree.root);
    const texts = collectTexts(tree.root);

    expect(texts.some(text => text.includes('보낸 친구 요청이 없어요.'))).toBe(
      true,
    );
  });
});
