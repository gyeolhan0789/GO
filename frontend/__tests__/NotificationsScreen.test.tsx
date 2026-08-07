/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

import { useMarkNotificationReadMutation } from '../src/features/notification/hooks/useMarkNotificationReadMutation';
import { useNotificationsQuery } from '../src/features/notification/hooks/useNotificationsQuery';
import { navigateFromNotification } from '../src/features/notification/model/notificationNavigation';
import { NotificationsScreen } from '../src/screens/NotificationsScreen/NotificationsScreen';

jest.mock(
  '../src/features/notification/hooks/useMarkNotificationReadMutation',
  () => ({ useMarkNotificationReadMutation: jest.fn() }),
);
jest.mock('../src/features/notification/hooks/useNotificationsQuery', () => ({
  useNotificationsQuery: jest.fn(),
}));
jest.mock('../src/features/notification/model/notificationNavigation', () => ({
  navigateFromNotification: jest.fn(),
}));

const useNotificationsQueryMock = useNotificationsQuery as jest.Mock;
const useMarkNotificationReadMutationMock =
  useMarkNotificationReadMutation as jest.Mock;
const navigateFromNotificationMock = navigateFromNotification as jest.Mock;

const mutate = jest.fn();
const refetch = jest.fn();
const fetchNextPage = jest.fn();
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

function queryState(overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ content: [], hasNext: false }], pageParams: [0] },
    isLoading: false,
    isError: false,
    isRefetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    refetch,
    fetchNextPage,
    ...overrides,
  };
}

function visibleText(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string')
    .join(' ');
}

function renderScreen() {
  act(() => {
    renderer = ReactTestRenderer.create(<NotificationsScreen />);
  });

  if (renderer === null) {
    throw new Error('renderer not initialized');
  }

  return renderer;
}

beforeEach(() => {
  jest.clearAllMocks();
  useNotificationsQueryMock.mockReturnValue(queryState());
  useMarkNotificationReadMutationMock.mockReturnValue({ mutate });
});

afterEach(() => {
  if (renderer !== null) {
    act(() => renderer?.unmount());
    renderer = null;
  }
});

test('알림이 없으면 빈 상태 안내를 보여준다', () => {
  const tree = renderScreen();

  expect(visibleText(tree)).toContain('아직 도착한 알림이 없어요');
});

test('알림을 누르면 읽음 처리하고 타입에 맞는 이동을 요청한다', () => {
  useNotificationsQueryMock.mockReturnValue(
    queryState({
      data: {
        pages: [
          {
            content: [
              {
                id: 17,
                type: 'FRIEND_REQUEST',
                title: '친구 요청이 도착했어요',
                body: '새로운 친구 요청을 확인해 주세요.',
                targetId: 31,
                read: false,
                createdAt: '2026-08-06T14:00:00',
              },
            ],
            hasNext: false,
          },
        ],
        pageParams: [0],
      },
    }),
  );
  const tree = renderScreen();
  const row = tree.root
    .findAll(
      node =>
        node.props.accessibilityLabel ===
        '친구 요청이 도착했어요, 읽지 않음',
    )
    .at(0);

  act(() => row?.props.onPress());

  expect(mutate).toHaveBeenCalledWith(17);
  expect(navigateFromNotificationMock).toHaveBeenCalledWith(
    'FRIEND_REQUEST',
    31,
  );
});

test('이미 읽은 알림은 다시 읽음 요청하지 않는다', () => {
  useNotificationsQueryMock.mockReturnValue(
    queryState({
      data: {
        pages: [
          {
            content: [
              {
                id: 18,
                type: 'REWARD_EARNED',
                title: '보상을 획득했어요',
                body: '100포인트를 획득했어요.',
                targetId: 9,
                read: true,
                createdAt: '2026-08-06T14:00:00',
              },
            ],
            hasNext: false,
          },
        ],
        pageParams: [0],
      },
    }),
  );
  const tree = renderScreen();
  const row = tree.root
    .findAll(
      node => node.props.accessibilityLabel === '보상을 획득했어요, 읽음',
    )
    .at(0);

  act(() => row?.props.onPress());

  expect(mutate).not.toHaveBeenCalled();
  expect(navigateFromNotificationMock).toHaveBeenCalledWith(
    'REWARD_EARNED',
    9,
  );
});

test('조회 실패 시 다시 시도할 수 있다', () => {
  useNotificationsQueryMock.mockReturnValue(queryState({ isError: true }));
  const tree = renderScreen();
  const retryButton = tree.root
    .findAll(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .at(0);

  expect(visibleText(tree)).toContain('알림을 불러오지 못했어요');

  act(() => retryButton?.props.onPress());
  expect(refetch).toHaveBeenCalledTimes(1);
});
