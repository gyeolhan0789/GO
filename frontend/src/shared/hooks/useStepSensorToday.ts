import { useQuery } from '@tanstack/react-query';

import type { SamsungHealthSummary } from '../lib/samsungHealth';
import { isStepSensorAvailable, readStepSensorToday } from '../lib/stepSensor';
import type { SamsungHealthState } from './useSamsungHealthToday';
import { checkPermission } from '../lib/permissions';

/** 걸음 센서는 걸음수만 준다. 거리/활동칼로리는 삼성헬스 전용 지표라 0으로 둔다. */
function toSummary(steps: number): SamsungHealthSummary {
  return { steps, distanceMeters: 0, activeCalories: 0 };
}

async function fetchStepSensorToday(): Promise<SamsungHealthState> {
  if (!isStepSensorAvailable()) {
    return { status: 'unavailable' };
  }
  if (!(await checkPermission('activityRecognition'))) {
    return { status: 'denied' };
  }
  const steps = await readStepSensorToday();
  if (steps === null) {
    return { status: 'error' };
  }
  return { status: 'ok', summary: toSummary(steps) };
}

type UseStepSensorTodayOptions = {
  /** 산책 세션 화면처럼 값이 계속 갱신돼야 하는 곳에서만 넘긴다(ms). */
  refetchInterval?: number;
  /** false를 주면 새로 읽지 않고 마지막 값을 그대로 보여준다. */
  enabled?: boolean;
};

/**
 * 오늘의 걸음수를 기기 자체 걸음 센서(TYPE_STEP_COUNTER)로 조회한다.
 * 삼성헬스 미동의/미지원 사용자를 위한 대체 경로다.
 */
export function useStepSensorToday(options: UseStepSensorTodayOptions = {}) {
  return useQuery({
    queryKey: ['stepSensor', 'today'],
    queryFn: fetchStepSensorToday,
    refetchInterval: options.refetchInterval,
    enabled: options.enabled ?? true,
  });
}
