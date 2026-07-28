import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { areAllPermissionsGranted } from '../lib/permissions';
import {
  getPermissionsCompleted,
  setPermissionsCompleted,
} from '../lib/permissionsStorage';

const PERMISSIONS_QUERY_KEY = ['permissions', 'completed'] as const;
const PERMISSIONS_GRANTED_QUERY_KEY = ['permissions', 'granted'] as const;

type UsePermissionsStatusResult = {
  isLoading: boolean;
  hasCompleted: boolean;
  /** 진입 게이트 통과 여부. 플로우를 마쳤고 권한도 그대로 남아 있어야 한다. */
  isSatisfied: boolean;
  complete: () => Promise<void>;
};

/**
 * 권한 요청 플로우 완료 상태를 읽고 완료 처리를 제공한다.
 * (온보딩 useOnboardingStatus와 동일 구조 — 저장/조회는 lib에 위임)
 *
 * 게이트 판정에는 저장된 완료 플래그와 실제 런타임 권한 상태를 함께 본다.
 * - 플래그만 보면 사용자가 나중에 설정에서 권한을 회수한 걸 놓친다.
 * - 런타임 상태만 보면 런타임 권한이 없는 환경(iOS·낮은 API 레벨)에서 항상
 *   통과라 권한 안내 화면을 한 번도 못 보여준다.
 */
export function usePermissionsStatus(): UsePermissionsStatusResult {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: getPermissionsCompleted,
  });

  const { data: allGranted, isLoading: isGrantedLoading } = useQuery({
    queryKey: PERMISSIONS_GRANTED_QUERY_KEY,
    queryFn: areAllPermissionsGranted,
  });

  const mutation = useMutation({
    mutationFn: setPermissionsCompleted,
    onSuccess: () => {
      queryClient.setQueryData(PERMISSIONS_QUERY_KEY, true);
      // 방금 권한을 받고 넘어온 참이라 런타임 상태도 다시 읽는다.
      queryClient.invalidateQueries({
        queryKey: PERMISSIONS_GRANTED_QUERY_KEY,
      });
    },
  });

  const hasCompleted = data ?? false;

  return {
    isLoading: isLoading || isGrantedLoading,
    hasCompleted,
    isSatisfied: hasCompleted && (allGranted ?? false),
    complete: mutation.mutateAsync,
  };
}
