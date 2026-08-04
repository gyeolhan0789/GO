import { useCallback, useEffect } from 'react';

import {
  consumeWearCommands,
  isWearBridgeAvailable,
  subscribeWearCommands,
  syncWearState,
  type WearState,
} from '../../../shared/lib/wearBridge';

/**
 * 로그아웃 상태에서 워치에 보내는 상태. 수치는 전부 비우고 `loggedIn: false`만
 * 알린다 — 워치는 이 값을 보고 로그인 안내를 띄운다.
 */
const SIGNED_OUT_STATE: WearState = {
  loggedIn: false,
  nickname: '',
  today: { steps: 0, distanceMeters: 0, calories: 0, goalSteps: 0 },
  rooms: [],
  session: null,
};

/**
 * 갤럭시 워치 컴패니언의 로그아웃 쪽 절반.
 *
 * [useWearCompanion]은 로그인 상태에서만 도는데, 그동안 워치는 폰이 마지막으로
 * 보낸 값을 그대로 들고 있다. 로그아웃해도 지난 로그인 때의 닉네임·걸음수가
 * 남아 있고, 한 번도 로그인하지 않았으면 빈 값이 "0걸음"으로 보인다. 둘 다
 * 사용자가 뭘 해야 하는지 알 수 없는 화면이다.
 *
 * 그래서 로그아웃 상태에서도 이 신호만은 보낸다. 조회는 하나도 하지 않는다
 * (전부 401이다).
 */
export function useWearSignedOutSync() {
  const pushSignedOut = useCallback(() => {
    syncWearState(SIGNED_OUT_STATE);
  }, []);

  useEffect(() => {
    if (!isWearBridgeAvailable()) {
      return;
    }
    pushSignedOut();
  }, [pushSignedOut]);

  // 워치 앱을 열면 request-sync가 온다. 로그아웃 중에도 답해야 한다 — 안 그러면
  // 워치가 지난 로그인 때의 화면을 계속 들고 있는다. 다른 명령(시작·종료)은
  // 로그인해야 처리할 수 있으므로 큐에서 버린다.
  useEffect(() => {
    if (!isWearBridgeAvailable()) {
      return;
    }
    const drain = async () => {
      const commands = await consumeWearCommands();
      if (commands.length > 0) {
        pushSignedOut();
      }
    };
    drain();
    return subscribeWearCommands(() => {
      drain();
    });
  }, [pushSignedOut]);
}
