import { useStepDataToday } from '../../../shared/hooks/useStepDataToday';
import { useWalkSession } from '../../walk-session/hooks/useWalkSession';
import type { ActivityMetrics } from '../model/missionJudgment';

/** WalkSessionScreen과 같은 주기로 오늘 걸음 데이터를 다시 읽는다. */
const DAILY_STEPS_REFETCH_INTERVAL_MS = 20_000;

/**
 * 사진이 아닌 활동 미션(isActivityMissionComplete)을 판정하는 데 필요한
 * 지표를 한 곳에 모은다. 세션 누적값(걸음/거리/칼로리/활동 시간)과 연속
 * 구간값은 WalkTracking 세션에서, 오늘 누적 걸음은 별도의
 * useStepDataToday(삼성헬스 또는 기기 센서)에서 가져온다.
 */
export function useActivityMetrics(): ActivityMetrics {
  const walkSession = useWalkSession();
  const stepDataToday = useStepDataToday({
    refetchInterval: DAILY_STEPS_REFETCH_INTERVAL_MS,
    enabled: !walkSession.isPaused,
  });
  const dailySteps =
    stepDataToday.data?.status === 'ok' ? stepDataToday.data.summary.steps : 0;

  return {
    totalSteps: walkSession.steps,
    continuousSteps: walkSession.continuousSteps,
    activeElapsedMs: walkSession.elapsedMs,
    continuousActiveMs: walkSession.continuousActiveMs,
    distanceMeters: walkSession.distanceMeters,
    calories: walkSession.calories,
    dailySteps,
  };
}
