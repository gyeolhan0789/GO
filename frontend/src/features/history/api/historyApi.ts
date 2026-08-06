import { apiClient } from '../../../shared/api/client';

/** 백엔드 HistoryPeriod와 동일. */
export type HistoryPeriod = 'DAY' | 'WEEK' | 'MONTH';

export type HistoryDateResponse = {
  /** 'yyyy-MM-dd'. */
  historyDate: string;
  step: number;
  /** 미터. */
  distance: number;
  /** kcal. */
  calories: number;
};

export type HistoryResponse = {
  period: HistoryPeriod;
  /** 'yyyy-MM-dd'. */
  startDate: string;
  /** 'yyyy-MM-dd'. */
  endDate: string;
  totalStep: number;
  totalDistance: number;
  totalCalories: number;
  /**
   * startDate부터 endDate까지 하루도 빠지지 않고 채워져 온다.
   * 기록이 없는 날은 step/distance/calories가 0인 항목으로 내려온다.
   */
  histories: HistoryDateResponse[];
};

export type GetHistoriesParams = {
  period: HistoryPeriod;
  /** 조회 기준일 'yyyy-MM-dd'. 이 날이 속한 일/주/월 구간을 서버가 계산한다. */
  date: string;
};

export function getHistories({ period, date }: GetHistoriesParams) {
  return apiClient.get<HistoryResponse>(
    `/histories?period=${period}&date=${date}`,
  );
}

export type SaveHistoryRequest = {
  /** 'yyyy-MM-dd'. */
  historyDate: string;
  step: number;
  /** 미터. */
  distance: number;
  /** kcal. */
  calories: number;
};

/**
 * 하루치 활동 기록을 서버에 더한다.
 *
 * 덮어쓰기가 아니라 **누적**이다(백엔드 MemberHistory.add). 산책 완료 처리도 같은 행에
 * 더하므로, 보낼 양은 "그날 총합 − 이미 반영된 양"이어야 한다. 그 계산은 걸음 원장이
 * 맡는다([[stepLedger]]).
 */
export function saveHistory(body: SaveHistoryRequest) {
  return apiClient.post<void>('/histories', body);
}

