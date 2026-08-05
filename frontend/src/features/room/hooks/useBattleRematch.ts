import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { rematchBattle } from '../../bingo/api/bingoApi';
import {
  publishStompTopic,
  subscribeStompTopic,
} from '../../../shared/api/stompClient';

/**
 * 재대결 제안이 오가는 방 토픽.
 *
 * 서버는 재대결에 어떤 이벤트도 발행하지 않는다(rematch API는 판만 만들고 끝난다).
 * 그래서 브로커를 우편함처럼 빌려 클라이언트끼리 직접 주고받는다 — SimpleBroker는
 * 브로커 목적지로 온 SEND를 그 토픽 구독자에게 그대로 중계한다.
 *
 * 진행률 토픽(`/battle-progress`)에 얹지 않고 따로 두는 이유: 그쪽은 서버가 쏘는
 * 채널이라 우리 메시지가 섞이면 진행률 파서가 알 수 없는 모양을 만나게 된다.
 */
function rematchTopic(roomId: number): string {
  return `/topic/rooms/${roomId}/rematch`;
}

/**
 * 재대결 제안 메시지. 서버를 거치지 않는 우리끼리의 약속이라 필드를 최소로 둔다.
 *
 * - `OFFER`: 방장이 "한 판 더 하자"고 보낸다.
 * - `ACCEPT`: 상대가 받아들인다. 이걸 받은 방장이 rematch API를 부른다.
 * - `DECLINE`: 상대가 거절한다.
 */
export type RematchMessage = {
  type: 'OFFER' | 'ACCEPT' | 'DECLINE';
  roomId: number;
  /** 보낸 사람. 내가 보낸 메시지는 내가 무시해야 해서 필요하다. */
  fromMemberId: number;
};

/** 제안을 받아들일 수 있는 시간. 지나면 사라져서 하염없이 남지 않는다. */
const OFFER_TTL_MS = 60_000;

type UseBattleRematchOptions = {
  roomId: number;
  myMemberId: number | null;
  isHost: boolean;
  /** 대결이 끝나 재대결을 제안할 수 있는 상태인지. */
  enabled: boolean;
  /** 새 판이 만들어졌을 때. 판을 다시 읽는 건 호출부가 한다. */
  onRematchStarted: () => void;
};

/**
 * 재대결을 제안하고 받아들인다.
 *
 * 서버 API(`POST /rooms/{roomId}/battles/rematch`)는 **방장만** 부를 수 있고
 * 부르는 즉시 새 판이 생긴다. 그래서 방장이 곧바로 부르면 상대는 시작된 줄도
 * 모르고 남겨진다 — 상대가 접속해 있는지 알 방법이 없기 때문이다.
 *
 * 그래서 순서를 뒤집는다: 방장은 제안만 보내고, 상대의 ACCEPT를 받은 뒤에 API를
 * 부른다. 상대가 앱을 껐어도 아무것도 깨지지 않는다 — 제안이 그냥 만료된다.
 */
export function useBattleRematch({
  roomId,
  myMemberId,
  isHost,
  enabled,
  onRematchStarted,
}: UseBattleRematchOptions) {
  /** 방장: 상대의 응답을 기다리는 중. */
  const [isOffering, setOffering] = useState(false);
  /** 상대: 방장이 보낸 제안이 도착했다. */
  const [hasIncomingOffer, setIncomingOffer] = useState(false);
  const [isStarting, setStarting] = useState(false);

  const queryClient = useQueryClient();
  const startedRef = useRef(onRematchStarted);
  startedRef.current = onRematchStarted;

  const offerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearOfferTimer = () => {
    if (offerTimerRef.current !== null) {
      clearTimeout(offerTimerRef.current);
      offerTimerRef.current = null;
    }
  };
  useEffect(() => clearOfferTimer, []);

  // 방장이 ACCEPT를 받으면 그때 판을 만든다. 이 호출만이 실제 재대결 시작이다.
  const startRematch = useCallback(async () => {
    setStarting(true);
    try {
      await rematchBattle(roomId);
      // 새 판이 생겼으니 방·판 조회를 모두 무효화한다.
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      await queryClient.invalidateQueries({
        queryKey: ['bingoBoards', 'active', roomId],
      });
      startedRef.current();
    } finally {
      setStarting(false);
      setOffering(false);
      clearOfferTimer();
    }
  }, [roomId, queryClient]);

  useEffect(() => {
    if (!enabled || myMemberId === null) {
      return;
    }

    const subscription = subscribeStompTopic<RematchMessage>(
      rematchTopic(roomId),
      message => {
        // 브로커는 보낸 사람에게도 되돌려준다. 내 메시지는 흘린다.
        if (message.fromMemberId === myMemberId) {
          return;
        }

        if (message.type === 'OFFER') {
          if (!isHost) {
            setIncomingOffer(true);
            clearOfferTimer();
            offerTimerRef.current = setTimeout(() => {
              offerTimerRef.current = null;
              setIncomingOffer(false);
            }, OFFER_TTL_MS);
          }
          return;
        }

        if (message.type === 'ACCEPT') {
          // 판을 만드는 건 방장만 할 수 있다(API 제약).
          if (isHost) {
            startRematch().catch(() => {
              // 진행 중 게임이 있거나 멤버가 빠졌으면 서버가 거절한다.
              // 화면은 제안 상태를 풀고 원래대로 돌아간다.
              setOffering(false);
            });
          }
          return;
        }

        // DECLINE
        setOffering(false);
        clearOfferTimer();
      },
    );

    return () => subscription.unsubscribe();
  }, [roomId, myMemberId, isHost, enabled, startRematch]);

  const send = useCallback(
    (type: RematchMessage['type']) => {
      if (myMemberId === null) {
        return;
      }
      publishStompTopic<RematchMessage>(rematchTopic(roomId), {
        type,
        roomId,
        fromMemberId: myMemberId,
      });
    },
    [roomId, myMemberId],
  );

  /** 방장: 한 판 더 하자고 제안한다. */
  const offerRematch = useCallback(() => {
    setOffering(true);
    send('OFFER');
    clearOfferTimer();
    offerTimerRef.current = setTimeout(() => {
      offerTimerRef.current = null;
      setOffering(false);
    }, OFFER_TTL_MS);
  }, [send]);

  /** 상대: 제안을 받아들인다. 판은 방장이 만든다. */
  const acceptRematch = useCallback(() => {
    setIncomingOffer(false);
    clearOfferTimer();
    send('ACCEPT');
  }, [send]);

  /** 상대: 제안을 거절한다. */
  const declineRematch = useCallback(() => {
    setIncomingOffer(false);
    clearOfferTimer();
    send('DECLINE');
  }, [send]);

  return {
    isOffering,
    hasIncomingOffer,
    isStarting,
    offerRematch,
    acceptRematch,
    declineRematch,
  };
}
