import { useCallback, useEffect, useRef } from 'react';

import { subscribeStompTopic } from '../../../shared/api/stompClient';

/**
 * 개인 큐로 오는 대결 매칭 이벤트. 백엔드 BattleMatchingMessage와 같은 모양이다.
 *
 * `countdownSeconds`는 카운트다운에만 실린다(거절·취소는 null). 서버가 3·2·1을
 * 따로 쏘지 않고 이 값 하나만 주므로 세는 건 화면이 한다.
 */
export type BattleMatchingEvent = {
  type:
    | 'BATTLE_COUNTDOWN_STARTED'
    | 'INVITATION_REJECTED'
    | 'INVITATION_CANCELLED';
  roomId: number;
  requestId: number;
  hostId: number;
  inviteeId: number;
  countdownSeconds: number | null;
};

/** 서버는 `/user/{memberId}/queue/battle`로 풀어서 보낸다. */
const DESTINATION = '/user/queue/battle';

/**
 * `waitUntilSubscribed`가 기다려 주는 상한.
 *
 * 구독은 CONNECTED를 받은 뒤에야 서버로 나간다. 소켓이 안 붙으면 그 순간이 오지
 * 않아서, 상한이 없으면 이걸 기다리는 **요청 자체가 영영 안 나간다.** 실시간을
 * 못 받는 것보다 그게 훨씬 나쁘다 — 놓친 이벤트는 REST 조회로 복구할 수 있다.
 */
const SUBSCRIBE_WAIT_LIMIT_MS = 1_000;

type BattleMatchingSubscriptionOptions = {
  /**
   * 주면 이 방의 이벤트만 넘긴다 — 큐는 사람 단위라 다른 방 것도 섞여 들어온다.
   * null이면 걸러내지 않는다(초대 목록처럼 어느 방이 올지 미리 모를 때).
   */
  roomId: number | null;
  enabled: boolean;
  onEvent: (event: BattleMatchingEvent) => void;
};

/**
 * 대결 매칭 이벤트를 구독한다.
 *
 * 반환하는 `waitUntilSubscribed`는 수락처럼 **구독보다 먼저 도착하면 안 되는**
 * 요청 앞에 둔다. 서버가 방 단위 접속 상태를 들고 있지 않아서, 구독 전에 수락이
 * 들어가면 카운트다운 이벤트가 허공으로 나가고 화면은 영영 기다리게 된다.
 */
export function useBattleMatchingSubscription({
  roomId,
  enabled,
  onEvent,
}: BattleMatchingSubscriptionOptions) {
  // 핸들러는 렌더마다 새로 만들어진다. 그대로 의존성에 넣으면 구독이 매번
  // 끊겼다 붙어서, 그 틈에 온 이벤트를 놓친다.
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  const readyRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = subscribeStompTopic<BattleMatchingEvent>(
      DESTINATION,
      event => {
        if (roomId !== null && event.roomId !== roomId) {
          return;
        }
        handlerRef.current(event);
      },
    );
    readyRef.current = subscription.ready;

    return () => {
      readyRef.current = null;
      subscription.unsubscribe();
    };
  }, [roomId, enabled]);

  /**
   * 구독이 서버로 나갈 때까지, 길어도 상한까지만 기다린다. 뒤따르는 요청을
   * 막지 않는 게 이 함수의 계약이다.
   */
  const waitUntilSubscribed = useCallback(async () => {
    const ready = readyRef.current;
    if (ready === null) {
      return;
    }
    await Promise.race([
      ready,
      new Promise<void>(resolve =>
        setTimeout(resolve, SUBSCRIBE_WAIT_LIMIT_MS),
      ),
    ]);
  }, []);

  return { waitUntilSubscribed };
}
