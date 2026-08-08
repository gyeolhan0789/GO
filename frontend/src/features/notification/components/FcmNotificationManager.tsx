import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  getMessaging,
  getInitialNotification,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';

import { useAuth } from '../../auth/model/AuthContext';
import { updateMyFcmToken } from '../api/notificationApi';
import { navigateFromNotificationData } from '../model/notificationNavigation';
import { InAppNotificationBanner } from './InAppNotificationBanner';

type ForegroundNotification = {
  id: number;
  message: RemoteMessage;
};

function warnFcmFailure(action: string, error: unknown) {
  console.warn(`[FCM] ${action} 실패`, error);
}

/**
 * 인증된 Android 사용자와 현재 앱 설치의 FCM 토큰을 연결하고,
 * 포그라운드에서 수신한 notification 메시지를 사용자에게 보여준다.
 */
export function FcmNotificationManager() {
  const { status } = useAuth();
  const notificationSequence = useRef(0);
  const [foregroundNotification, setForegroundNotification] =
    useState<ForegroundNotification | null>(null);

  const hideForegroundNotification = useCallback(() => {
    setForegroundNotification(null);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || status !== 'authenticated') {
      return;
    }

    const messaging = getMessaging();
    let cancelled = false;

    async function syncToken(token: string) {
      if (cancelled || token.trim().length === 0) {
        return;
      }

      if (__DEV__) {
        console.info('[FCM] Firebase 콘솔 테스트용 토큰:', token);
      }

      try {
        await updateMyFcmToken(token);
      } catch (error) {
        warnFcmFailure('토큰 동기화', error);
      }
    }

    const unsubscribeTokenRefresh = onTokenRefresh(messaging, syncToken);
    const unsubscribeForegroundMessage = onMessage(messaging, message => {
      const title = message.notification?.title;
      const body = message.notification?.body;
      if (!title && !body) {
        return;
      }

      notificationSequence.current += 1;
      setForegroundNotification({
        id: notificationSequence.current,
        message,
      });
    });
    const unsubscribeNotificationOpened = onNotificationOpenedApp(
      messaging,
      message => navigateFromNotificationData(message.data),
    );

    getInitialNotification(messaging)
      .then(message => {
        if (!cancelled && message !== null) {
          navigateFromNotificationData(message.data);
        }
      })
      .catch(error => warnFcmFailure('종료 상태 알림 확인', error));

    getToken(messaging)
      .then(token => syncToken(token))
      .catch(error => warnFcmFailure('토큰 발급', error));

    return () => {
      cancelled = true;
      unsubscribeTokenRefresh();
      unsubscribeForegroundMessage();
      unsubscribeNotificationOpened();
    };
  }, [status]);

  if (foregroundNotification === null) {
    return null;
  }

  const { id, message } = foregroundNotification;
  return (
    <InAppNotificationBanner
      key={id}
      title={message.notification?.title ?? '알림'}
      body={message.notification?.body}
      onHide={hideForegroundNotification}
      onPress={() => {
        hideForegroundNotification();
        navigateFromNotificationData(message.data);
      }}
    />
  );
}
