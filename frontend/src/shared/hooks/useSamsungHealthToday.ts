import { useQuery } from '@tanstack/react-query';

import {
  hasSamsungHealthPermissions,
  isSamsungHealthAvailable,
  readSamsungHealthToday,
  type SamsungHealthSummary,
} from '../lib/samsungHealth';

export type SamsungHealthState =
  | { status: 'unavailable' } // 갤럭시/삼성헬스 SDK 사용 불가
  | { status: 'denied' } // 권한 미허용
  | { status: 'error' } // 읽기 실패
  | { status: 'ok'; summary: SamsungHealthSummary };

async function fetchSamsungHealthToday(): Promise<SamsungHealthState> {
  if (!isSamsungHealthAvailable()) {
    return { status: 'unavailable' };
  }
  if (!(await hasSamsungHealthPermissions())) {
    return { status: 'denied' };
  }
  const summary = await readSamsungHealthToday();
  if (!summary) {
    return { status: 'error' };
  }
  return { status: 'ok', summary };
}

/**
 * 오늘의 삼성헬스 요약(걸음/거리/활동칼로리)을 상태와 함께 조회한다.
 */
export function useSamsungHealthToday() {
  return useQuery({
    queryKey: ['samsungHealth', 'today'],
    queryFn: fetchSamsungHealthToday,
  });
}
