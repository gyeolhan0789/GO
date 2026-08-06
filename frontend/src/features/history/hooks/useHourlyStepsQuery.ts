import { useQuery } from '@tanstack/react-query';

import {
  hasSamsungHealthPermissions,
  isSamsungHealthAvailable,
  readSamsungHealthHourlySteps,
} from '../../../shared/lib/samsungHealth';
import { buildHourlySteps } from '../model/samsungHealthHistory';
import type { HourlyStep } from '../types';

async function fetchHourlySteps(date: string): Promise<HourlyStep[]> {
  // useHistoriesQuery가 같은 화면에 이미 오류를 띄우므로 조용히 비운다.
  if (!(await isSamsungHealthAvailable())) {
    return [];
  }
  if (!(await hasSamsungHealthPermissions())) {
    return [];
  }

  try {
    const hourlySteps = await readSamsungHealthHourlySteps(date);
    return hourlySteps === null ? [] : buildHourlySteps(hourlySteps);
  } catch {
    return [];
  }
}

/**
 * 하루의 시간대별 걸음.
 * @param enabled 일간 구간을 보고 있을 때만 켠다.
 */
export function useHourlyStepsQuery(date: string, enabled: boolean) {
  return useQuery({
    queryKey: ['hourly-steps', date],
    queryFn: () => fetchHourlySteps(date),
    enabled,
    retry: false,
  });
}
