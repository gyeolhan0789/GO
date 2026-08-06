/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert, Platform } from 'react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';

import { FcmNotificationManager } from '../src/features/notification/components/FcmNotificationManager';
import { updateMyFcmToken } from '../src/features/notification/api/notificationApi';
import { useAuth } from '../src/features/auth/model/AuthContext';

jest.mock('../src/features/notification/api/notificationApi', () => ({
  updateMyFcmToken: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/features/auth/model/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const getMessagingMock = getMessaging as jest.MockedFunction<
  typeof getMessaging
>;
const getTokenMock = getToken as jest.MockedFunction<typeof getToken>;
const onMessageMock = onMessage as jest.MockedFunction<typeof onMessage>;
const onTokenRefreshMock = onTokenRefresh as jest.MockedFunction<
  typeof onTokenRefresh
>;
const updateMyFcmTokenMock = updateMyFcmToken as jest.MockedFunction<
  typeof updateMyFcmToken
>;
const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;

const messaging = {} as ReturnType<typeof getMessaging>;
const originalPlatformOs = Platform.OS;

let tokenRefreshListener: ((token: string) => unknown) | null;
let messageListener: ((message: RemoteMessage) => unknown) | null;
let unsubscribeTokenRefresh: jest.Mock;
let unsubscribeMessage: jest.Mock;
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
    renderer = ReactTestRenderer.create(<FcmNotificationManager />);
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
  unsubscribeTokenRefresh = jest.fn();
  unsubscribeMessage = jest.fn();

  getMessagingMock.mockReturnValue(messaging);
  getTokenMock.mockResolvedValue('initial-fcm-token');
  onTokenRefreshMock.mockImplementation((_messaging, listener) => {
    tokenRefreshListener = listener;
    return unsubscribeTokenRefresh;
  });
  onMessageMock.mockImplementation((_messaging, listener) => {
    messageListener = listener;
    return unsubscribeMessage;
  });
  updateMyFcmTokenMock.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
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

test('포그라운드 알림의 제목과 내용을 사용자에게 보여준다', async () => {
  await renderManager();

  await act(async () => {
    await messageListener?.({
      notification: {
        title: '친구 요청이 도착했어요',
        body: '알림 내용을 확인해 주세요.',
      },
    } as RemoteMessage);
  });

  expect(Alert.alert).toHaveBeenCalledWith(
    '친구 요청이 도착했어요',
    '알림 내용을 확인해 주세요.',
  );
});

test('로그아웃 상태에서는 FCM 토큰과 메시지를 구독하지 않는다', async () => {
  setAuthStatus('unauthenticated');

  await renderManager();

  expect(getMessagingMock).not.toHaveBeenCalled();
  expect(getTokenMock).not.toHaveBeenCalled();
  expect(onTokenRefreshMock).not.toHaveBeenCalled();
  expect(onMessageMock).not.toHaveBeenCalled();
});

test('아직 네이티브 설정하지 않은 iOS에서는 FCM을 시작하지 않는다', async () => {
  setPlatformOs('ios');

  await renderManager();

  expect(getMessagingMock).not.toHaveBeenCalled();
  expect(getTokenMock).not.toHaveBeenCalled();
  expect(onTokenRefreshMock).not.toHaveBeenCalled();
  expect(onMessageMock).not.toHaveBeenCalled();
});

test('컴포넌트가 해제되면 FCM 구독도 정리한다', async () => {
  const tree = await renderManager();

  act(() => {
    tree.unmount();
  });
  renderer = null;

  expect(unsubscribeTokenRefresh).toHaveBeenCalledTimes(1);
  expect(unsubscribeMessage).toHaveBeenCalledTimes(1);
});
