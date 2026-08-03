import { useInfiniteQuery } from '@tanstack/react-query';

import { getSentRequests, searchMembers } from '../api/friendApi';
import type { SentFriendRequest } from '../api/friendApi';

/** 한 번에 받아오는 요청 수. */
export const SENT_REQUEST_PAGE_SIZE = 20;

/**
 * 보낸 요청 응답에는 아바타 필드가 아직 없어(백엔드 추가 대기), 아바타가
 * 실려 오는 회원 검색을 받는 사람 닉네임으로 조회해 inviteeId로 맞춰 채운다.
 * 검색이 실패하면 목록은 그대로 두고 아바타만 기본 아이콘으로 남긴다.
 * 백엔드가 필드를 내려주기 시작하면 이 우회는 걷어낸다.
 */
async function withInviteeAvatars(
  requests: SentFriendRequest[],
): Promise<SentFriendRequest[]> {
  const nicknames = [...new Set(requests.map(r => r.inviteeNickname))];
  const searched = await Promise.all(
    nicknames.map(async keyword => {
      try {
        return (await searchMembers({ keyword })).content;
      } catch {
        return [];
      }
    }),
  );
  const membersById = new Map(
    searched.flat().map(member => [member.memberId, member]),
  );

  return requests.map(request => {
    const member = membersById.get(request.inviteeId);

    return member
      ? {
          ...request,
          gender: member.gender,
          defaultImageUrl: member.defaultImageUrl,
          equippedItems: member.equippedItems,
        }
      : request;
  });
}

/** 내가 보낸 친구 요청 전체. 서버는 최신순 한 가지로만 준다. */
export function useSentRequestsQuery() {
  return useInfiniteQuery({
    queryKey: ['friend-requests', 'sent'],
    queryFn: async ({ pageParam }) => {
      const slice = await getSentRequests({
        page: pageParam,
        size: SENT_REQUEST_PAGE_SIZE,
      });

      return { ...slice, content: await withInviteeAvatars(slice.content) };
    },
    initialPageParam: 0,
    // 전체 개수를 모르니 페이지 번호를 직전 값에서 하나씩 올린다.
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasNext ? lastPageParam + 1 : undefined,
  });
}
