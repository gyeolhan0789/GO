import { useInfiniteQuery } from '@tanstack/react-query';

import { getWalkSessions } from '../../walk-session/api/walkSessionApi';
import { toWalkRecord } from '../model/walkSession';
import type { WalkPage } from '../types';

/** 한 번에 받아오는 산책 수. */
export const WALK_PAGE_SIZE = 10;

async function fetchWalkPage(page: number): Promise<WalkPage> {
  const slice = await getWalkSessions({ page, size: WALK_PAGE_SIZE });

  return { content: slice.content.map(toWalkRecord), hasNext: slice.hasNext };
}

/**
 * 전체 산책 목록. 서버는 최신순 한 가지로만 주고 기간·인원 조건은 받지 않아
 * 화면에도 거르는 손잡이를 두지 않았다 — 받아온 페이지에서 걸러내면 조건에 맞는
 * 항목이 페이지 경계에 흩어져 2페이지부터 개수와 순서가 어긋난다.
 */
export function useWalksInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: ['walk-sessions', 'list'],
    queryFn: ({ pageParam }) => fetchWalkPage(pageParam),
    initialPageParam: 0,
    // 전체 개수를 모르니 페이지 번호를 직전 값에서 하나씩 올린다.
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? lastPageParam + 1 : undefined,
  });
}
