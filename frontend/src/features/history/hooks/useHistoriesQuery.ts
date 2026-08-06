import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { todayIso } from '../../../shared/lib/isoDate';
import {
  hasSamsungHealthPermissions,
  isSamsungHealthAvailable,
  readSamsungHealthDailySummaries,
} from '../../../shared/lib/samsungHealth';
import { useStepDataToday } from '../../../shared/hooks/useStepDataToday';
import {
  getHistories,
  type HistoryPeriod,
  type HistoryResponse,
} from '../api/historyApi';
import { buildHistoryResponse } from '../model/samsungHealthHistory';
import { resolvePeriodRange } from '../model/period';
import { withTodaySummary } from '../model/serverHistory';

/** 화면이 message를 그대로 보여준다. 0으로 채우면 '안 걸었다'와 구분이 안 된다. */
export class SamsungHealthReadError extends Error {}

const UNAVAILABLE_MESSAGE =
  '삼성헬스를 사용할 수 없는 기기예요. 갤럭시에서 확인해주세요.';
const STALE_BINARY_MESSAGE =
  '앱을 다시 빌드해야 해요. 걸음 기록 조회 기능이 설치된 앱에 아직 없어요.';
const READ_FAILED_MESSAGE = '삼성헬스에서 걸음 기록을 읽지 못했어요';

/** JS만 갱신하고 네이티브가 옛 버전이면 호출이 'is not a function'으로 터진다. */
function isMissingNativeMethod(error: unknown): boolean {
  return (
    error instanceof TypeError && error.message.includes('is not a function')
  );
}

/**
 * 삼성헬스에서 읽을 수 있는지. `useStepDataToday`의 판단과 같은 기준이라 오늘 걸음수와
 * 기록 그래프가 서로 다른 소스를 보는 일이 없다.
 */
export async function canReadSamsungHealthHistories(): Promise<boolean> {
  return (
    (await isSamsungHealthAvailable()) && (await hasSamsungHealthPermissions())
  );
}

async function fetchSamsungHealthHistories(
  period: HistoryPeriod,
  date: string,
): Promise<HistoryResponse> {
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

async function fetchHistories(
  period: HistoryPeriod,
  date: string,
): Promise<HistoryResponse> {
  if (await canReadSamsungHealthHistories()) {
    return fetchSamsungHealthHistories(period, date);
  }

  // 삼성헬스가 없거나 동의하지 않은 기기. 서버에 쌓아둔 일일 기록을 읽는다
  // (기기에서 센 걸음은 [[useDailyStepSync]]가 하루 단위로 올린다).
  return getHistories({ period, date });
}

type UseHistoriesQueryOptions = {
  /** 산책 세션 화면처럼 오늘 몫이 실시간으로 반영돼야 하는 곳에서만 넘긴다(ms). */
  refetchInterval?: number;
  enabled?: boolean;
};

/**
 * 구간별 활동 기록.
 *
 * 삼성헬스를 읽을 수 있으면 SDK에서 직접 읽고, 아니면 서버(GET /histories)에서 읽는다.
 * 서버 경로에서는 오늘 몫이 아직 안 올라가 있으므로 기기에서 센 오늘 값으로 채운다.
 */
export function useHistoriesQuery(
  period: HistoryPeriod,
  date: string,
  options: UseHistoriesQueryOptions = {},
) {
  const query = useQuery({
    queryKey: ['histories', period, date],
    queryFn: () => fetchHistories(period, date),
    retry: false,
    refetchInterval: options.refetchInterval,
    enabled: options.enabled ?? true,
  });
  // 이미 떠 있는 쿼리를 같은 키로 함께 보는 것뿐이라 요청이 늘지 않는다.
  const today = useStepDataToday(options);
  const summary = today.data?.status === 'ok' ? today.data.summary : null;
  const history = query.data;

  // 어느 소스를 썼는지는 따지지 않는다. 삼성헬스 경로에서는 두 값이 같은 SDK에서 온
  // 것이라 큰 쪽을 골라도 그대로다.
  const data = useMemo(() => {
    const { startDate, endDate } = resolvePeriodRange(period, date);
    const todayIsoDate = todayIso();

    if (
      history === undefined ||
      summary === null ||
      todayIsoDate < startDate ||
      todayIsoDate > endDate
    ) {
      return history;
    }
    return withTodaySummary(history, todayIsoDate, summary);
  }, [period, date, history, summary]);

  // data만 갈아 끼운 새 객체를 매 렌더 만들면 이걸 보는 useMemo/useEffect가 계속
  // 다시 돈다. 채울 게 없으면 쿼리 결과를 그대로 돌려준다.
  return data === history ? query : { ...query, data };
}
