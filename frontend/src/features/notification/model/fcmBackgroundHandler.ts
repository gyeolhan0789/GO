import { Platform } from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

/** notification payload는 OS가 표시한다. 핸들러는 백그라운드 수신을 정상 등록한다. */
export function registerFcmBackgroundHandler() {
  if (Platform.OS !== 'android') {
    return;
  }

  setBackgroundMessageHandler(getMessaging(), async () => undefined);
}
