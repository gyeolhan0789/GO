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
  if (!(await isSamsungHealthAvailable())) {
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

type UseSamsungHealthTodayOptions = {
  /** 산책 세션 화면처럼 값이 계속 갱신돼야 하는 곳에서만 넘긴다(ms). */
  refetchInterval?: number;
  /** false를 주면(예: 산책 일시정지 중) 새로 읽지 않고 마지막 값을 그대로 보여준다. */
  enabled?: boolean;
};

/**
 * 오늘의 삼성헬스 요약(걸음/거리/활동칼로리)을 상태와 함께 조회한다.
 */
export function useSamsungHealthToday(options: UseSamsungHealthTodayOptions = {}) {
  return useQuery({
    queryKey: ['samsungHealth', 'today'],
    queryFn: fetchSamsungHealthToday,
    refetchInterval: options.refetchInterval,
    enabled: options.enabled ?? true,
  });
}
