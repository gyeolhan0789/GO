/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  getMessaging,
  getInitialNotification,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';

import { FcmNotificationManager } from '../src/features/notification/components/FcmNotificationManager';
import { updateMyFcmToken } from '../src/features/notification/api/notificationApi';
import { navigateFromNotificationData } from '../src/features/notification/model/notificationNavigation';
import { useAuth } from '../src/features/auth/model/AuthContext';

jest.mock('../src/features/notification/api/notificationApi', () => ({
  updateMyFcmToken: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/features/auth/model/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../src/features/notification/model/notificationNavigation', () => ({
  navigateFromNotificationData: jest.fn(),
}));

const getMessagingMock = getMessaging as jest.MockedFunction<
  typeof getMessaging
>;
const getInitialNotificationMock = getInitialNotification as jest.MockedFunction<
  typeof getInitialNotification
>;
const getTokenMock = getToken as jest.MockedFunction<typeof getToken>;
const onMessageMock = onMessage as jest.MockedFunction<typeof onMessage>;
const onNotificationOpenedAppMock =
  onNotificationOpenedApp as jest.MockedFunction<
    typeof onNotificationOpenedApp
  >;
const onTokenRefreshMock = onTokenRefresh as jest.MockedFunction<
  typeof onTokenRefresh
>;
const updateMyFcmTokenMock = updateMyFcmToken as jest.MockedFunction<
  typeof updateMyFcmToken
>;
const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;
const navigateFromNotificationDataMock =
  navigateFromNotificationData as jest.MockedFunction<
    typeof navigateFromNotificationData
  >;

const messaging = {} as ReturnType<typeof getMessaging>;
const originalPlatformOs = Platform.OS;

let tokenRefreshListener: ((token: string) => unknown) | null;
let messageListener: ((message: RemoteMessage) => unknown) | null;
let notificationOpenedListener: ((message: RemoteMessage) => unknown) | null;
let unsubscribeTokenRefresh: jest.Mock;
let unsubscribeMessage: jest.Mock;
let unsubscribeNotificationOpened: jest.Mock;
let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

function setPlatformOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: os,
  });
}

function setAuthStatus(status: 'authenticated' | 'unauthenticated') {
  useAuthMock.mockReturnValue({
    status,
    isAuthenticated: status === 'authenticated',
    signIn: jest.fn(async () => undefined),
    signOut: jest.fn(async () => undefined),
  });
}

async function renderManager() {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 1080, height: 2400 },
          insets: { top: 24, right: 0, bottom: 24, left: 0 },
        }}
      >
        <FcmNotificationManager />
      </SafeAreaProvider>,
    );
  });

  if (!renderer) {
    throw new Error('renderer not initialized');
  }

  return renderer;
}

beforeEach(() => {
  jest.clearAllMocks();
  setPlatformOs('android');
  setAuthStatus('authenticated');
  tokenRefreshListener = null;
  messageListener = null;
  notificationOpenedListener = null;
  unsubscribeTokenRefresh = jest.fn();
  unsubscribeMessage = jest.fn();
  unsubscribeNotificationOpened = jest.fn();

  getMessagingMock.mockReturnValue(messaging);
  getInitialNotificationMock.mockResolvedValue(null);
  getTokenMock.mockResolvedValue('initial-fcm-token');
  onTokenRefreshMock.mockImplementation((_messaging, listener) => {
    tokenRefreshListener = listener;
    return unsubscribeTokenRefresh;
  });
  onMessageMock.mockImplementation((_messaging, listener) => {
    messageListener = listener;
    return unsubscribeMessage;
  });
  onNotificationOpenedAppMock.mockImplementation((_messaging, listener) => {
    notificationOpenedListener = listener;
    return unsubscribeNotificationOpened;
  });
  updateMyFcmTokenMock.mockResolvedValue(undefined);
  jest.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
  jest.restoreAllMocks();
  setPlatformOs(originalPlatformOs);
});

test('로그인하면 현재 FCM 토큰을 저장하고 갱신 토큰도 다시 저장한다', async () => {
  await renderManager();

  expect(getTokenMock).toHaveBeenCalledWith(messaging);
  expect(updateMyFcmTokenMock).toHaveBeenCalledWith('initial-fcm-token');

  await act(async () => {
    await tokenRefreshListener?.('refreshed-fcm-token');
  });

  expect(updateMyFcmTokenMock).toHaveBeenLastCalledWith(
    'refreshed-fcm-token',
  );
});

test('포그라운드 알림을 상단 배너로 보여주고 누르면 관련 화면 이동을 요청한다', async () => {
  const tree = await renderManager();

  const data = { type: 'FRIEND_REQUEST', targetId: '31' };
  await act(async () => {
    await messageListener?.({
      notification: {
        title: '친구 요청이 도착했어요',
        body: '알림 내용을 확인해 주세요.',
      },
      data,
    } as unknown as RemoteMessage);
  });

  const banner = tree.root.findByProps({
    accessibilityLabel: '친구 요청이 도착했어요, 알림 열기',
  });
  expect(
    tree.root.findByProps({ children: '알림 내용을 확인해 주세요.' }),
  ).toBeTruthy();

  act(() => {
    banner.props.onPress();
  });

  expect(navigateFromNotificationDataMock).toHaveBeenCalledWith(data);
  expect(
    tree.root.findAllByProps({
      accessibilityLabel: '친구 요청이 도착했어요, 알림 열기',
    }),
  ).toHaveLength(0);
});

test('백그라운드 알림을 탭하면 관련 화면 이동을 요청한다', async () => {
  await renderManager();

  const data = { type: 'WALK_START', targetId: '12' };
  notificationOpenedListener?.({ data } as unknown as RemoteMessage);

  expect(navigateFromNotificationDataMock).toHaveBeenCalledWith(data);
});

test('알림으로 앱을 처음 실행해도 관련 화면 이동을 요청한다', async () => {
  const data = { type: 'WEEKLY_BINGO_RENEWAL', targetId: '7' };
  getInitialNotificationMock.mockResolvedValue(
    { data } as unknown as RemoteMessage,
  );

  await renderManager();

  expect(navigateFromNotificationDataMock).toHaveBeenCalledWith(data);
});

test('로그아웃 상태에서는 FCM 토큰과 메시지를 구독하지 않는다', async () => {
  setAuthStatus('unauthenticated');

  await renderManager();

  expect(getMessagingMock).not.toHaveBeenCalled();
  expect(getTokenMock).not.toHaveBeenCalled();
  expect(onTokenRefreshMock).not.toHaveBeenCalled();
  expect(onMessageMock).not.toHaveBeenCalled();
  expect(onNotificationOpenedAppMock).not.toHaveBeenCalled();
  expect(getInitialNotificationMock).not.toHaveBeenCalled();
});

test('아직 네이티브 설정하지 않은 iOS에서는 FCM을 시작하지 않는다', async () => {
  setPlatformOs('ios');

  await renderManager();

  expect(getMessagingMock).not.toHaveBeenCalled();
  expect(getTokenMock).not.toHaveBeenCalled();
  expect(onTokenRefreshMock).not.toHaveBeenCalled();
  expect(onMessageMock).not.toHaveBeenCalled();
  expect(onNotificationOpenedAppMock).not.toHaveBeenCalled();
  expect(getInitialNotificationMock).not.toHaveBeenCalled();
});

test('컴포넌트가 해제되면 FCM 구독도 정리한다', async () => {
  const tree = await renderManager();

  act(() => {
    tree.unmount();
  });
  renderer = null;

  expect(unsubscribeTokenRefresh).toHaveBeenCalledTimes(1);
  expect(unsubscribeMessage).toHaveBeenCalledTimes(1);
  expect(unsubscribeNotificationOpened).toHaveBeenCalledTimes(1);
});
