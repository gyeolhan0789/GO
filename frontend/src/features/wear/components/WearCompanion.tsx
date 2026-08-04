import { useAuth } from '../../auth/model/AuthContext';
import { useWearCompanion } from '../hooks/useWearCompanion';

/**
 * 갤럭시 워치 연동을 앱이 떠 있는 동안 계속 돌게 붙잡아두는 자리. 그리는 건
 * 없고, 화면 밖에서 도는 동기화·명령 처리만 담당한다.
 *
 * 로그인 전에는 보낼 상태도 없고 조회는 전부 401이라 아예 켜지 않는다.
 */
export function WearCompanion() {
  const { status } = useAuth();

  if (status !== 'authenticated') {
    return null;
  }
  return <WearCompanionSync />;
}

function WearCompanionSync() {
  useWearCompanion();
  return null;
}
