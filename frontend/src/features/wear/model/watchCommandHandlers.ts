import { Alert } from 'react-native';

import { navigationRef } from '../../../app/navigation/navigationRef';
import type { WearState } from '../../../shared/lib/wearBridge';
import {
  isWalkSessionActive,
  requestWalkSessionEnd,
  startWalkSession,
} from '../../walk-session/model/walkSessionStore';

/**
 * 워치에서 온 명령을 폰의 흐름으로 되돌리는 부분.
 *
 * 훅 밖에 두는 건 렌더와 아무 상관이 없기 때문이다(스토어를 건드리고 화면을
 * 옮길 뿐이다). 워치 연동에서 제일 틀리기 쉬운 분기라 따로 테스트한다.
 */

function goToWalkSession() {
  // 세션 복구가 아직 안 끝났으면(알림을 탭해 앱이 막 뜬 경우) 화면을 옮길 수
  // 없다. 그래도 세션 자체는 시작되므로 홈 화면의 '산책 중' 뱃지로 들어갈 수 있다.
  if (navigationRef.isReady()) {
    navigationRef.navigate('WalkSession');
  }
}

export function startFromWatch(roomId: number | undefined, state: WearState) {
  if (roomId === undefined) {
    return;
  }
  // 이미 진행 중이면 새로 시작하지 않고 그 세션으로 데려간다(폰에서 먼저
  // 시작해둔 경우). 다른 방이어도 마찬가지다 — 동시에 두 개를 돌릴 수 없다.
  if (isWalkSessionActive()) {
    goToWalkSession();
    return;
  }

  // 워치 목록이 오래됐을 수 있어 여기서 한 번 더 본다. 빙고판 갱신은 폰에서만
  // 할 수 있으므로 워치에서 시작시키면 안 된다.
  const room = state.rooms.find(candidate => candidate.roomId === roomId);
  if (room && !room.startable) {
    Alert.alert(
      '아직 시작할 수 없어요',
      room.blockedReason ?? '폰에서 산책방을 먼저 확인해주세요.',
    );
    return;
  }

  startWalkSession(roomId);
  goToWalkSession();
}

export function endFromWatch() {
  if (!isWalkSessionActive()) {
    return;
  }
  // 기록 저장과 결과 화면은 진행 중 화면이 맡는다. 여기서는 종료를 요청하고
  // 그 화면을 띄우기만 한다(WalkSessionScreen이 요청을 보고 이어받는다).
  requestWalkSessionEnd();
  goToWalkSession();
}
