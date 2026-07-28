import { useQuery } from '@tanstack/react-query';

import { LOGIN_HISTORY_QUERY_KEY } from '../api/deviceQueries';
import { getHasLoggedInBefore } from '../lib/loginHistoryStorage';

type UseHasLoggedInBeforeResult = {
  isLoading: boolean;
  hasLoggedInBefore: boolean;
};

/**
 * 이 기기의 로그인 이력을 AsyncStorage에서 읽는다. 저장/조회는
 * shared/lib/loginHistoryStorage로 위임하고, 여기서는 기존 상태 패턴
 * (TanStack Query)에 맞춰 캐시만 관리한다. 기록은 로그인 성공 시점에
 * useLoginMutation이 수행한다.
 */
export function useHasLoggedInBefore(): UseHasLoggedInBeforeResult {
  const { data, isLoading } = useQuery({
    queryKey: LOGIN_HISTORY_QUERY_KEY,
    queryFn: getHasLoggedInBefore,
  });

  return {
    isLoading,
    hasLoggedInBefore: data ?? false,
  };
}
