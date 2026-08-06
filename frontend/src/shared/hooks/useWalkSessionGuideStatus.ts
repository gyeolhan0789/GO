import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { WALK_SESSION_GUIDE_QUERY_KEY } from '../api/deviceQueries';
import {
  getWalkSessionGuideSeen,
  setWalkSessionGuideSeen,
} from '../lib/walkSessionGuideStorage';

type UseWalkSessionGuideStatusResult = {
  isLoading: boolean;
  hasSeen: boolean;
  markSeen: () => Promise<void>;
};

/**
 * 산책 화면 첫 안내를 봤는지 AsyncStorage에서 읽고, 봤다고 표시한다.
 * 저장/조회는 shared/lib/walkSessionGuideStorage로 위임하고, 여기서는
 * 온보딩·권한과 같은 상태 패턴(TanStack Query)에 맞춰 캐시만 관리한다.
 */
export function useWalkSessionGuideStatus(): UseWalkSessionGuideStatusResult {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: WALK_SESSION_GUIDE_QUERY_KEY,
    queryFn: getWalkSessionGuideSeen,
  });

  const mutation = useMutation({
    mutationFn: setWalkSessionGuideSeen,
    onSuccess: () => {
      queryClient.setQueryData(WALK_SESSION_GUIDE_QUERY_KEY, true);
    },
  });

  return {
    isLoading,
    hasSeen: data ?? false,
    markSeen: mutation.mutateAsync,
  };
}
