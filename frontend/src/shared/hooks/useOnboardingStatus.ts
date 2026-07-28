import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ONBOARDING_QUERY_KEY } from '../api/deviceQueries';
import {
  getOnboardingCompleted,
  setOnboardingCompleted,
} from '../lib/onboardingStorage';

type UseOnboardingStatusResult = {
  isLoading: boolean;
  hasCompleted: boolean;
  complete: () => Promise<void>;
};

/**
 * 온보딩 완료 상태를 AsyncStorage에서 읽고, 완료 처리를 제공한다.
 * 저장/조회는 shared/lib/onboardingStorage로 위임하고, 여기서는
 * 기존 서버 상태 패턴(TanStack Query)에 맞춰 캐시만 관리한다.
 */
export function useOnboardingStatus(): UseOnboardingStatusResult {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: getOnboardingCompleted,
  });

  const mutation = useMutation({
    mutationFn: setOnboardingCompleted,
    onSuccess: () => {
      queryClient.setQueryData(ONBOARDING_QUERY_KEY, true);
    },
  });

  return {
    isLoading,
    hasCompleted: data ?? false,
    complete: mutation.mutateAsync,
  };
}
