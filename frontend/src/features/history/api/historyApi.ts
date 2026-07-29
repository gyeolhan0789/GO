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
