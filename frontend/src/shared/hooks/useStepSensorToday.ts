import { useQuery } from '@tanstack/react-query';

import { todayIso } from '../lib/isoDate';
import type { SamsungHealthSummary } from '../lib/samsungHealth';
import { stepsOn } from '../lib/stepLedger';
import { syncStepLedger } from '../lib/stepLedgerSync';
import { isStepSensorAvailable } from '../lib/stepSensor';
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
  // 조회가 곧 원장 갱신이다. 화면을 볼 때마다 센서를 읽어야 자정·재부팅 경계에서
  // 다음 날로 밀리는 구간이 짧아진다.
  const ledger = await syncStepLedger();
  if (ledger === null) {
    return { status: 'error' };
  }
  return { status: 'ok', summary: toSummary(stepsOn(ledger, todayIso())) };
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
 *
 * 센서 원시값을 그대로 쓰지 않고 걸음 원장([[stepLedger]])을 거친다 — 원시값은 재부팅
 * 이후 누적이라 날짜별로 나누는 계산이 필요하고, 그 결과를 일일 기록 전송도 같이 쓴다.
 */
export function useStepSensorToday(options: UseStepSensorTodayOptions = {}) {
  return useQuery({
    queryKey: ['stepSensor', 'today'],
    queryFn: fetchStepSensorToday,
    refetchInterval: options.refetchInterval,
    enabled: options.enabled ?? true,
  });
}
