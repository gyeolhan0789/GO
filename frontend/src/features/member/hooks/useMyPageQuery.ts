import { useQuery } from '@tanstack/react-query';

import { getMyPage } from '../api/memberApi';

type UseMyPageQueryOptions = {
  enabled?: boolean;
};

/** 이메일/닉네임/성별/지역/캐시. 회원가입 이후 거의 바뀌지 않는 값이라
 * staleTime을 무한으로 둔다. */
export function useMyPageQuery(options: UseMyPageQueryOptions = {}) {
  return useQuery({
    queryKey: ['member', 'me'],
    queryFn: getMyPage,
    staleTime: Infinity,
    enabled: options.enabled ?? true,
  });
}
