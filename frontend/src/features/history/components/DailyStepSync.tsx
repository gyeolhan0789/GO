import { useDailyStepSync } from '../hooks/useDailyStepSync';
import { useStepCountingService } from '../hooks/useStepCountingService';

/**
 * 걸음 원장 갱신과 지난 날짜 활동 기록 전송을 앱이 떠 있는 동안 붙잡아두는 자리.
 * 그리는 건 없고 화면 밖에서 도는 동기화만 담당한다([[WearCompanion]]과 같은 구조).
 */
export function DailyStepSync() {
  // 원장이 읽을 값이 실제로 늘어나게 만드는 쪽이라 갱신보다 먼저 띄운다.
  useStepCountingService();
  useDailyStepSync();
  return null;
}
