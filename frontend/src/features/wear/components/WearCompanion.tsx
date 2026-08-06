import { useAuth } from '../../auth/model/AuthContext';
import { useWearCompanion } from '../hooks/useWearCompanion';
import { useWearSignedOutSync } from '../hooks/useWearSignedOutSync';

/**
 * 갤럭시 워치 연동을 앱이 떠 있는 동안 계속 돌게 붙잡아두는 자리. 그리는 건
 * 없고, 화면 밖에서 도는 동기화·명령 처리만 담당한다.
 *
 * 로그인 상태에 따라 두 갈래다. 로그인 전에는 조회가 전부 401이라 상태를 만들
 * 수 없지만, 그렇다고 아무것도 안 보내면 워치가 지난 로그인 때의 값을 계속
 * 들고 있게 된다. 그래서 "로그인해야 한다"는 사실만 보내는 쪽으로 나눴다.
 */
export function WearCompanion() {
  const { status } = useAuth();

  // `restoring` 동안에는 어느 쪽도 켜지 않는다. 로그인 여부를 아직 모르는데
  // 로그아웃으로 밀어버리면, 세션이 복구되는 흔한 경우에도 워치에 로그인
  // 안내가 한 번 깜빡인다.
  if (status === 'restoring') {
    return null;
  }
  return status === 'authenticated' ? <WearCompanionSync /> : <WearSignedOutSync />;
}

function WearCompanionSync() {
  useWearCompanion();
  return null;
}

function WearSignedOutSync() {
  useWearSignedOutSync();
  return null;
}
