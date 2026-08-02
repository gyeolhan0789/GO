import { useCallback, useEffect, useRef } from 'react';

import {
  consumeWearCommands,
  isWearBridgeAvailable,
  subscribeWearCommands,
  syncWearCharacter,
  syncWearState,
  type WearCommand,
  type WearState,
} from '../../../shared/lib/wearBridge';
import { useStepDataToday } from '../../../shared/hooks/useStepDataToday';
import { useMyCharacterQuery } from '../../member/hooks/useMyCharacterQuery';
import { toWalkSessionMetrics } from '../../walk-session/model/sessionMetrics';
import { useWalkSession } from '../../walk-session/hooks/useWalkSession';
import { toCharacterLayerSources } from '../model/characterLayerSources';
import { endFromWatch, startFromWatch } from '../model/watchCommandHandlers';
import { useWatchConnected } from './useWatchConnected';
import { useWearRooms } from './useWearRooms';

/** 진행 중 화면(WalkSessionScreen)과 같은 주기로 읽어야 워치와 숫자가 안 어긋난다. */
const HEALTH_POLL_INTERVAL_MS = 20000;

/**
 * 갤럭시 워치 컴패니언의 폰 쪽 절반.
 *
 * 폰이 상태의 주인이다. 화면에 그리는 것과 같은 값을 워치로 밀어주고, 워치가
 * 누른 것을 받아 폰의 흐름(walkSessionStore + 화면 이동)으로 되돌린다. 워치는
 * 서버를 직접 부르지 않으므로 인증·API·기록 저장은 전부 폰에 남는다.
 */
export function useWearCompanion() {
  const watchConnected = useWatchConnected();
  const rooms = useWearRooms(watchConnected);
  const characterQuery = useMyCharacterQuery();
  const session = useWalkSession();

  // 산책 중에는 워치도 숫자가 살아 있어야 한다. 진행 중 화면이 안 떠 있어도
  // (홈으로 나갔거나 폰을 주머니에 넣었어도) 여기서 계속 읽는다.
  const health = useStepDataToday({
    refetchInterval:
      session.isActive && !session.isPaused ? HEALTH_POLL_INTERVAL_MS : undefined,
  });
  const healthSummary = health.data?.status === 'ok' ? health.data.summary : null;

  const sessionMetrics = toWalkSessionMetrics(
    healthSummary,
    session.startHealthSummary,
  );
  const sessionRoomName =
    rooms.find(room => room.roomId === session.roomId)?.name ?? '';

  const state: WearState = {
    nickname: characterQuery.data?.nickname ?? '',
    today: {
      steps: healthSummary?.steps ?? 0,
      distanceMeters: Math.round(healthSummary?.distanceMeters ?? 0),
      calories: Math.round(healthSummary?.activeCalories ?? 0),
      // TODO: 목표 걸음수는 아직 서버에 없다(HomeScreen도 목업 상수를 쓴다).
      // 0이면 워치가 진행률 링을 그리지 않고 걸음수만 보여준다.
      goalSteps: 0,
    },
    rooms,
    session:
      session.roomId === null
        ? null
        : {
            roomId: session.roomId,
            roomName: sessionRoomName,
            started: session.isStarted,
            paused: session.isPaused,
            elapsedSeconds: session.elapsedSeconds,
            steps: sessionMetrics.steps,
            distanceMeters: Math.round(sessionMetrics.distanceKm * 1000),
            calories: sessionMetrics.calories,
          },
  };

  // 명령 처리와 강제 동기화가 항상 최신 값을 보도록 붙잡아둔다. 이벤트 구독을
  // 매 렌더 다시 걸지 않으려는 것이기도 하다.
  const stateRef = useRef(state);
  stateRef.current = state;

  const pushState = useCallback(() => {
    syncWearState(stateRef.current);
  }, []);

  // 경과 시간은 1초마다 바뀌지만 워치가 자기 시계로 이어 세므로 그때마다
  // 보낼 이유가 없다. 나머지가 바뀔 때만 밀고, 그 값에 경과 시간을 얹어 보낸다.
  const syncSignature = JSON.stringify({
    ...state,
    session: state.session ? { ...state.session, elapsedSeconds: 0 } : null,
  });

  useEffect(() => {
    if (!isWearBridgeAvailable() || !watchConnected) {
      return;
    }
    pushState();
  }, [syncSignature, watchConnected, pushState]);

  const characterSources = characterQuery.data
    ? toCharacterLayerSources(characterQuery.data)
    : [];
  const characterSourcesRef = useRef(characterSources);
  characterSourcesRef.current = characterSources;
  // 배열은 렌더마다 새 참조라 의존성으로 못 쓴다. 내용이 바뀔 때만 다시 보낸다
  // (합성은 네트워크와 비트맵 작업이라 매번 하면 안 된다).
  const characterSignature = characterSources.join('|');

  const pushCharacter = useCallback(() => {
    syncWearCharacter(characterSourcesRef.current);
  }, []);

  useEffect(() => {
    if (!isWearBridgeAvailable() || !watchConnected) {
      return;
    }
    pushCharacter();
  }, [characterSignature, watchConnected, pushCharacter]);

  const runCommand = useCallback(
    (command: WearCommand) => {
      switch (command.type) {
        case 'start-walk':
          startFromWatch(command.roomId, stateRef.current);
          return;
        case 'end-walk':
          endFromWatch();
          return;
        case 'request-sync':
          // 워치 앱을 열었을 때 온다. 캐릭터까지 같이 보내는 게 중요하다 —
          // 캐릭터는 평소 "옷 조합이 바뀔 때"만 보내는데, 워치 앱을 다시
          // 깔면 Data Layer에 있던 이미지가 사라지고 폰 쪽 조합은 그대로라
          // 다시 보낼 계기가 영영 없다.
          pushState();
          pushCharacter();
          return;
      }
    },
    [pushState, pushCharacter],
  );

  const drainCommands = useCallback(async () => {
    const commands = await consumeWearCommands();
    commands.forEach(runCommand);
  }, [runCommand]);

  useEffect(() => {
    if (!isWearBridgeAvailable()) {
      return;
    }
    // 앱이 꺼져 있는 동안 도착한 명령이 큐에 남아 있을 수 있다.
    drainCommands();
    return subscribeWearCommands(() => {
      drainCommands();
    });
  }, [drainCommands]);
}
