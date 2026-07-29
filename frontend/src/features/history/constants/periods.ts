import type { HistoryPeriod } from '../api/historyApi';

export const PERIOD_OPTIONS: { label: string; value: HistoryPeriod }[] = [
  { label: '일간', value: 'DAY' },
  { label: '주간', value: 'WEEK' },
  { label: '월간', value: 'MONTH' },
];
