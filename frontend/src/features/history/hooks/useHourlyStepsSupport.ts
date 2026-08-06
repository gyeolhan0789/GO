import { useQuery } from '@tanstack/react-query';

import { canReadSamsungHealthHistories } from './useHistoriesQuery';

/**
 * 시간대별 걸음을 보여줄 수 있는지.
 *
 * 시간대별 데이터는 삼성헬스 SDK만 준다 — 서버 일일 기록(member_histories)은 하루 한
 * 행이라 담을 곳이 없다. 그래서 삼성헬스를 못 읽는 기기에서는 일간 구간 자체를 감춘다.
 * 판단이 끝나기 전에는 undefined다(구간 선택지를 깜빡이며 바꾸지 않도록).
 */
export function useHourlyStepsSupport() {
  return useQuery({
    // ['hourly-steps', ...]에 두면 날짜별 시간대 조회와 접두사를 공유해 한쪽을
    // 무효화할 때 같이 날아간다. 이 값은 기기 성질이라 다시 읽을 일이 없다.
    queryKey: ['samsungHealth', 'historiesSupported'],
    queryFn: canReadSamsungHealthHistories,
    staleTime: Infinity,
  });
}
