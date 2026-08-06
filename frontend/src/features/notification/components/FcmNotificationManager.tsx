import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';

import { useAuth } from '../../auth/model/AuthContext';
import { updateMyFcmToken } from '../api/notificationApi';

function showForegroundNotification(message: RemoteMessage) {
  const title = message.notification?.title;
  const body = message.notification?.body;

  if (!title && !body) {
    return;
  }

  Alert.alert(title ?? '알림', body ?? '');
}

function warnFcmFailure(action: string, error: unknown) {
  console.warn(`[FCM] ${action} 실패`, error);
}

/**
 * 인증된 Android 사용자와 현재 앱 설치의 FCM 토큰을 연결하고,
 * 포그라운드에서 수신한 notification 메시지를 사용자에게 보여준다.
 */
export function FcmNotificationManager() {
  const { status } = useAuth();

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
      showForegroundNotification(message);
    });

    getToken(messaging)
      .then(token => syncToken(token))
      .catch(error => warnFcmFailure('토큰 발급', error));

    return () => {
      cancelled = true;
      unsubscribeTokenRefresh();
      unsubscribeForegroundMessage();
    };
  }, [status]);

  return null;
}
