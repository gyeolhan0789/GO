/**
 * @format
 */

import { Platform } from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

import { registerFcmBackgroundHandler } from '../src/features/notification/model/fcmBackgroundHandler';

const getMessagingMock = getMessaging as jest.MockedFunction<
  typeof getMessaging
>;
const setBackgroundMessageHandlerMock =
  setBackgroundMessageHandler as jest.MockedFunction<
    typeof setBackgroundMessageHandler
  >;
const messaging = {} as ReturnType<typeof getMessaging>;
const originalPlatformOs = Platform.OS;

function setPlatformOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: os,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  getMessagingMock.mockReturnValue(messaging);
});

afterEach(() => {
  setPlatformOs(originalPlatformOs);
});

test('Android 앱 시작 시 백그라운드 메시지 핸들러를 등록한다', () => {
  setPlatformOs('android');

  registerFcmBackgroundHandler();

  expect(setBackgroundMessageHandlerMock).toHaveBeenCalledWith(
    messaging,
    expect.any(Function),
  );
});

test('iOS 네이티브 설정 전에는 백그라운드 메시지 핸들러를 등록하지 않는다', () => {
  setPlatformOs('ios');

  registerFcmBackgroundHandler();

  expect(getMessagingMock).not.toHaveBeenCalled();
  expect(setBackgroundMessageHandlerMock).not.toHaveBeenCalled();
});
