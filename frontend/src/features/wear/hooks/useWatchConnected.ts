import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  isWatchConnected,
  isWearBridgeAvailable,
  subscribeWatchConnection,
} from '../../../shared/lib/wearBridge';

/**
 * 워치 앱이 깔린 기기가 지금 닿는지.
 *
 * 워치가 없는 사용자에게 동기화용 추가 조회를 시키지 않으려고 쓴다. 연결이
 * 바뀌면 Play 서비스가 알려주므로(subscribeWatchConnection) 폴링하지 않는다.
 * 앱이 꺼져 있는 동안 바뀐 것까지는 못 받아서, 켜질 때와 전면으로 돌아올 때만
 * 한 번씩 직접 확인한다.
 */
export function useWatchConnected(): boolean {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isWearBridgeAvailable()) {
      return;
    }

    let isMounted = true;
    const check = async () => {
      const next = await isWatchConnected();
      if (isMounted) {
        setConnected(next);
      }
    };

    check();
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active') {
        check();
      }
    });
    const unsubscribe = subscribeWatchConnection(next => {
      if (isMounted) {
        setConnected(next);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
      unsubscribe();
    };
  }, []);

  return connected;
}
