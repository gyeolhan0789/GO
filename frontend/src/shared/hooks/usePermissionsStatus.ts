import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getPermissionsCompleted,
  setPermissionsCompleted,
} from '../lib/permissionsStorage';

const PERMISSIONS_QUERY_KEY = ['permissions', 'completed'] as const;

type UsePermissionsStatusResult = {
  isLoading: boolean;
  hasCompleted: boolean;
  complete: () => Promise<void>;
};

/**
 * 권한 요청 플로우 완료 상태를 읽고 완료 처리를 제공한다.
 * (온보딩 useOnboardingStatus와 동일 구조 — 저장/조회는 lib에 위임)
 */
export function usePermissionsStatus(): UsePermissionsStatusResult {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: getPermissionsCompleted,
  });

  const mutation = useMutation({
    mutationFn: setPermissionsCompleted,
    onSuccess: () => {
      queryClient.setQueryData(PERMISSIONS_QUERY_KEY, true);
    },
  });

  return {
    isLoading,
    hasCompleted: data ?? false,
    complete: mutation.mutateAsync,
  };
}
