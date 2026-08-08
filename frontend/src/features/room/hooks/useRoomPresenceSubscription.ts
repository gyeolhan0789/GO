import { useEffect, useRef, useState } from 'react';

import { subscribeStompTopic } from '../../../shared/api/stompClient';

export type RoomPresenceEventType = 'JOINED' | 'LEFT' | 'SYNC';

export type RoomPresenceMember = {
  memberId: number;
  /**
   * 서버가 memberId로 닉네임을 찾아 채우는데, 못 찾으면 그 자리가 빈다.
   * 이름을 그릴 때는 항상 대비해야 한다.
   */
  nickname: string | null;
};

/** 백엔드 RoomPresenceMessage와 같은 모양. */
export type RoomPresenceEvent = {
  type: RoomPresenceEventType;
  roomId: number;
  memberId: number;
  onlineCount: number;
  onlineMembers: RoomPresenceMember[];
};

/**
 * 접속 여부를 물어볼 수 있는 형태로 바꾼다.
 *
 * `null`(아직 이벤트를 못 받음)과 빈 배열(아무도 없음)의 차이를 여기서 한 번만
 * 다룬다. 화면마다 되풀이하면 구독 전에 전원을 오프라인으로 그리는 실수가 난다.
 * 모르는 동안에는 `null`을 그대로 넘겨 아무도 접속 표시를 받지 않게 한다.
 */
export function toOnlineMemberIds(
  onlineMembers: RoomPresenceMember[] | null,
): Set<number> | null {
  return onlineMembers === null
    ? null
    : new Set(onlineMembers.map(member => member.memberId));
}

type UseRoomPresenceSubscriptionOptions = {
  roomId: number | null;
  /**
   * **방 멤버임을 확인한 뒤에만 켠다.**
   *
   * 서버는 구독 시점에 방 멤버인지 확인하고, 아니면 SUBSCRIBE를 예외로 끊는다
   * (ROOM_MEMBER_FORBIDDEN). 그 예외는 STOMP ERROR 프레임으로 내려오는데
   * 우리 클라이언트는 ERROR를 "토큰이 만료됐다"로 읽어 토큰을 재발급하고 소켓을
   * 다시 연다. 다시 열면 구독을 전부 다시 보내므로 또 거절당하고, 이 화면뿐 아니라
   * 같은 소켓에 얹힌 빙고·대결 구독까지 끊어지는 재연결 루프에 빠진다.
   *
   * 대결 초대를 수락하기 전의 invitee가 대표적으로 멤버가 아니다.
   */
  enabled: boolean;
  /** 이벤트가 올 때마다. 스냅샷은 훅이 이미 반영한 뒤에 부른다. */
  onEvent?: (event: RoomPresenceEvent) => void;
};

/**
 * 방에 지금 접속해 있는 멤버를 실시간으로 받는다.
 *
 * 구독 자체가 입장이고 해지가 퇴장이다 — 따로 부를 REST API가 없다. 그래서 이
 * 훅은 방 화면이 살아 있는 동안만 붙어 있어야 하고, 화면을 벗어나면 정리되면서
 * 서버에 퇴장으로 알려진다.
 *
 * `JOINED`·`LEFT`·`SYNC` 모두 접속자 전체 스냅샷(`onlineMembers`)을 싣고 온다.
 * 타입별로 목록을 더하거나 빼지 않고 스냅샷으로 갈아 끼운다 — 이벤트를 한 번
 * 놓치면 증감식은 영구히 어긋나지만 스냅샷은 다음 이벤트에 저절로 맞는다.
 */
export function useRoomPresenceSubscription({
  roomId,
  enabled,
  onEvent,
}: UseRoomPresenceSubscriptionOptions) {
  // null은 "아직 모른다"다. 빈 배열(아무도 없음)과 구별해야 이 값으로 무언가를
  // 판정하는 쪽이 구독 전을 근거로 삼지 않는다.
  const [onlineMembers, setOnlineMembers] = useState<RoomPresenceMember[] | null>(
    null,
  );

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (roomId === null || !enabled) {
      return;
    }

    const subscription = subscribeStompTopic<RoomPresenceEvent>(
      `/topic/rooms/${roomId}/presence`,
      event => {
        // 다른 방 이벤트가 섞일 일은 없지만, 방을 옮기는 순간의 잔여 프레임이
        // 새 방 목록을 덮어쓰면 접속자가 잘못 그려진다.
        if (event.roomId !== roomId) {
          return;
        }

        setOnlineMembers(event.onlineMembers);
        onEventRef.current?.(event);
      },
    );

    return () => {
      subscription.unsubscribe();
      // 다시 붙을 때까지는 "모른다"로 되돌린다. 떠날 때 본 목록을 남겨두면
      // 재진입 직후 첫 이벤트가 오기 전까지 낡은 접속자가 보인다.
      setOnlineMembers(null);
    };
  }, [roomId, enabled]);

  return { onlineMembers };
}
