import { useQuery } from '@tanstack/react-query';

import {
  hasSamsungHealthPermissions,
  isSamsungHealthAvailable,
  readSamsungHealthDailySummaries,
} from '../../../shared/lib/samsungHealth';
import type { HistoryPeriod, HistoryResponse } from '../api/historyApi';
import { buildHistoryResponse } from '../model/samsungHealthHistory';
import { resolvePeriodRange } from '../model/period';

/** 화면이 message를 그대로 보여준다. 0으로 채우면 '안 걸었다'와 구분이 안 된다. */
export class SamsungHealthReadError extends Error {}

const UNAVAILABLE_MESSAGE =
  '삼성헬스를 사용할 수 없는 기기예요. 갤럭시에서 확인해주세요.';
const DENIED_MESSAGE = '삼성헬스 걸음 기록 권한이 필요해요.';
const STALE_BINARY_MESSAGE =
  '앱을 다시 빌드해야 해요. 걸음 기록 조회 기능이 설치된 앱에 아직 없어요.';
const READ_FAILED_MESSAGE = '삼성헬스에서 걸음 기록을 읽지 못했어요';

/** JS만 갱신하고 네이티브가 옛 버전이면 호출이 'is not a function'으로 터진다. */
function isMissingNativeMethod(error: unknown): boolean {
  return (
    error instanceof TypeError && error.message.includes('is not a function')
  );
}

async function fetchHistories(
  period: HistoryPeriod,
  date: string,
): Promise<HistoryResponse> {
  if (!isSamsungHealthAvailable()) {
    throw new SamsungHealthReadError(UNAVAILABLE_MESSAGE);
  }
  if (!(await hasSamsungHealthPermissions())) {
    throw new SamsungHealthReadError(DENIED_MESSAGE);
  }

  const { startDate, endDate } = resolvePeriodRange(period, date);
  let dailySummaries;
  try {
    dailySummaries = await readSamsungHealthDailySummaries(startDate, endDate);
  } catch (error) {
    if (isMissingNativeMethod(error)) {
      throw new SamsungHealthReadError(STALE_BINARY_MESSAGE);
    }
    // 원인을 붙인다. 뭉개면 권한·SDK 거부·기간 문제를 구분할 수 없다.
    throw new SamsungHealthReadError(
      `${READ_FAILED_MESSAGE}\n${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  // 빈 배열은 '그 기간에 기록이 없다'는 뜻이라 정상이다.
  if (dailySummaries === null) {
    throw new SamsungHealthReadError(UNAVAILABLE_MESSAGE);
  }

  return buildHistoryResponse(period, date, dailySummaries);
}

type UseHistoriesQueryOptions = {
  /** 산책 세션 화면처럼 오늘 몫이 실시간으로 반영돼야 하는 곳에서만 넘긴다(ms). */
  refetchInterval?: number;
  enabled?: boolean;
};

/** 구간별 활동 기록. 삼성헬스 SDK에서 읽어 서버 응답과 같은 형태로 만든다. */
export function useHistoriesQuery(
  period: HistoryPeriod,
  date: string,
  options: UseHistoriesQueryOptions = {},
) {
  return useQuery({
    queryKey: ['histories', period, date],
    queryFn: () => fetchHistories(period, date),
    retry: false,
    refetchInterval: options.refetchInterval,
    enabled: options.enabled ?? true,
  });
}
