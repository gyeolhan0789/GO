import { useMyPageQuery } from '../../features/member/hooks/useMyPageQuery';
import { estimateCalories, estimateDistanceMeters } from '../lib/stepEstimate';
import { useSamsungHealthToday, type SamsungHealthState } from './useSamsungHealthToday';
import { useStepSensorToday } from './useStepSensorToday';

type UseStepDataTodayOptions = {
  /** 산책 세션 화면처럼 값이 계속 갱신돼야 하는 곳에서만 넘긴다(ms). */
  refetchInterval?: number;
  /** false를 주면 새로 읽지 않고 마지막 값을 그대로 보여준다. */
  enabled?: boolean;
};

/**
 * 오늘의 걸음/거리/활동칼로리 요약. 삼성헬스를 쓸 수 있고 동의도 했으면 그
 * 값을 쓰고, 삼성헬스가 없거나(갤럭시가 아니거나) 동의하지 않았으면 기기
 * 자체 걸음 센서(ACTIVITY_RECOGNITION)로 대체한다. 센서는 걸음수만 주므로,
 * 거리/활동칼로리는 성별별 평균 보폭·걸음당 칼로리로 추정해서 채운다.
 */
export function useStepDataToday(options: UseStepDataTodayOptions = {}) {
  const samsung = useSamsungHealthToday(options);
  const needsSensorFallback =
    samsung.data?.status === 'unavailable' || samsung.data?.status === 'denied';

  const sensor = useStepSensorToday({
    ...options,
    enabled: (options.enabled ?? true) && needsSensorFallback,
  });
  // 성별을 알아야 거리/칼로리를 추정할 수 있다. 삼성헬스가 정상 동작하는
  // 사용자에게는 필요 없는 호출이라 대체 경로일 때만 요청한다.
  const myPageQuery = useMyPageQuery({ enabled: needsSensorFallback });

  if (!needsSensorFallback) {
    return samsung;
  }
  if (sensor.data?.status !== 'ok' || !myPageQuery.data) {
    return sensor;
  }

  const { gender } = myPageQuery.data;
  const { steps } = sensor.data.summary;
  const estimated: SamsungHealthState = {
    status: 'ok',
    summary: {
      steps,
      distanceMeters: estimateDistanceMeters(steps, gender),
      activeCalories: estimateCalories(steps, gender),
    },
  };
  return { ...sensor, data: estimated };
}
