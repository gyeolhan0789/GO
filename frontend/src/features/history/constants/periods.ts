import type { HistoryPeriod } from '../api/historyApi';

export const PERIOD_OPTIONS: { label: string; value: HistoryPeriod }[] = [
  { label: '일간', value: 'DAY' },
  { label: '주간', value: 'WEEK' },
  { label: '월간', value: 'MONTH' },
];

/**
 * 일간 구간은 시간대별 차트로 그리는데 그 데이터는 삼성헬스만 준다. 못 읽는 기기에서는
 * 하루 막대 하나만 남아 볼 게 없으므로 선택지에서 뺀다.
 */
export const PERIOD_OPTIONS_WITHOUT_DAY = PERIOD_OPTIONS.filter(
  option => option.value !== 'DAY',
);
