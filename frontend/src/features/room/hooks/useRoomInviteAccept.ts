import { useCallback, useEffect, useRef, useState } from 'react';

import type { ReceivedRoomInvite } from '../api/roomApi';
import { useAcceptRoomInviteMutation } from './useAcceptRoomInviteMutation';
import {
  useBattleMatchingSubscription,
  type BattleMatchingEvent,
} from './useBattleMatchingSubscription';

type UseRoomInviteAcceptOptions = {
  /** 수락 대기 중인 대결 초대가 있을 때만 소켓을 연다. */
  enabled: boolean;
  /** 대결이 성립해 카운트다운이 시작됐을 때. 방으로 보내는 건 호출부가 한다. */
  onBattleStarted: (event: BattleMatchingEvent) => void;
};

/**
 * 받은 초대를 수락한다. 협동과 대결의 절차가 다르다.
 *
 * - **협동**: 그냥 수락한다. 기다릴 이유가 없다.
 * - **대결**: 수락하는 순간 서버가 개인 큐로 카운트다운을 쏘고, 방 단위 접속
 *   상태는 저장하지 않는다. 구독보다 수락이 먼저 나가면 그 이벤트가 사라지므로
 *   구독이 나갈 때까지(상한 안에서) 기다린 뒤에 보낸다.
 *
 * 모드를 모르면 협동으로 취급한다. 서버가 아직 초대 응답에 mode를 안 실어 주는데,
 * 대결로 잘못 취급하면 협동 수락이 소켓을 기다리게 되고 소켓이 안 붙는 환경에서는
 * 수락 자체가 막힌다 — 그쪽이 훨씬 나쁘다.
 */
/**
 * 수락 뒤 카운트다운이 도착할 때까지 구독을 붙들어 두는 시간.
 *
 * 수락 응답이 오면 초대 목록이 갱신돼 PENDING이 사라지고, 그 순간 enabled가
 * 꺼지면 구독이(마지막이면 소켓째) 접힌다. 서버는 정확히 그 직후에 카운트다운을
 * 쏘므로 유예 없이는 이벤트가 그 틈으로 사라진다 — 실기기 로그로 확인했다.
 */
const COUNTDOWN_GRACE_MS = 10_000;

export function useRoomInviteAccept({
  enabled,
  onBattleStarted,
}: UseRoomInviteAcceptOptions) {
  const acceptMutation = useAcceptRoomInviteMutation();

  const handlerRef = useRef(onBattleStarted);
  handlerRef.current = onBattleStarted;

  // 방금 수락해서 카운트다운을 기다리는 중인가. 이 동안은 초대 목록이 비어도
  // 구독을 유지한다.
  const [awaitingCountdown, setAwaitingCountdown] = useState(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (graceTimerRef.current !== null) {
        clearTimeout(graceTimerRef.current);
      }
    },
    [],
  );

  const { waitUntilSubscribed } = useBattleMatchingSubscription({
    // 어느 방 초대를 수락할지 미리 모른다. 걸러내지 않고 다 받는다.
    roomId: null,
    enabled: enabled || awaitingCountdown,
    onEvent: event => {
      if (event.type !== 'BATTLE_COUNTDOWN_STARTED') {
        return;
      }
      if (graceTimerRef.current !== null) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      setAwaitingCountdown(false);
      handlerRef.current(event);
    },
  });

  const acceptInvite = useCallback(
    async (invite: ReceivedRoomInvite) => {
      // 어떤 모드인지 몰라도 항상 구독을 기다린다(상한 1초). 구독이 꺼져
      // 있으면 즉시 통과하고, 켜져 있으면 보통 이미 끝나 있어 비용이 없다.
      // 대결이었는데 안 기다리면 카운트다운이 허공으로 나간다.
      await waitUntilSubscribed();
      const result = await acceptMutation.mutateAsync({
        roomId: invite.roomId,
        requestId: invite.requestId,
      });
      // 협동이면 이벤트가 안 와서 유예가 그냥 만료된다. 손해는 소켓을 몇 초
      // 더 들고 있는 것뿐이다.
      setAwaitingCountdown(true);
      if (graceTimerRef.current !== null) {
        clearTimeout(graceTimerRef.current);
      }
      graceTimerRef.current = setTimeout(() => {
        graceTimerRef.current = null;
        setAwaitingCountdown(false);
      }, COUNTDOWN_GRACE_MS);
      return result;
    },
    [waitUntilSubscribed, acceptMutation],
  );

  return { acceptInvite, isAccepting: acceptMutation.isPending };
}
