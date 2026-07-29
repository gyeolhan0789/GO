import { useQuery } from '@tanstack/react-query';

import { buildMockWalkDetail } from '../mocks';

/** TODO: 산책 단위 기록 API가 아직 없다(../types.ts의 WalkDetail 참고). */
export function useWalkDetailQuery(walkId: number) {
  return useQuery({
    queryKey: ['walk-detail', walkId],
    queryFn: async () => buildMockWalkDetail(walkId),
  });
}
