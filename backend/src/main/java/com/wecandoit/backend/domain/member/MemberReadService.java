package com.wecandoit.backend.domain.member;

import com.wecandoit.backend.common.exception.CustomException;
import com.wecandoit.backend.common.exception.ErrorCode;
import com.wecandoit.backend.friend.repository.FriendRepository;
import com.wecandoit.backend.friendrequest.domain.FriendRequest;
import com.wecandoit.backend.friendrequest.repository.FriendRequestRepository;
import com.wecandoit.backend.domain.member.dto.MemberRelationshipStatus;
import com.wecandoit.backend.domain.member.dto.MemberSearchResponse;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberReadService {

    private final MemberRepository memberRepository;
    private final FriendRepository friendRepository;
    private final FriendRequestRepository friendRequestRepository;

    public List<MemberSearchResponse> searchMembers(Long memberId, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "검색어는 필수입니다.");
        }

        List<Member> members = memberRepository
                .findByNicknameContainingIgnoreCaseAndIdNot(keyword.trim(), memberId);
        if (members.isEmpty()) {
            return List.of();
        }

        Set<Long> candidateIds = members.stream()
                .map(Member::getId)
                .collect(Collectors.toSet());
        Set<Long> friendIds = new HashSet<>(
                friendRepository.findFriendMemberIds(memberId, candidateIds)
        );
        Map<Long, MemberRelationshipStatus> requestStatuses = getRequestStatuses(memberId, candidateIds);

        return members.stream()
                .map(member -> MemberSearchResponse.of(
                        member,
                        getRelationshipStatus(member.getId(), friendIds, requestStatuses)
                ))
                .toList();
    }

    private Map<Long, MemberRelationshipStatus> getRequestStatuses(
            Long memberId,
            Set<Long> candidateIds
    ) {
        Map<Long, MemberRelationshipStatus> statuses = new HashMap<>();
        for (FriendRequest request : friendRequestRepository.findPendingRelatedTo(memberId, candidateIds)) {
            if (request.getInviter().getId().equals(memberId)) {
                statuses.put(request.getInvitee().getId(), MemberRelationshipStatus.REQUEST_SENT);
                continue;
            }
            statuses.put(request.getInviter().getId(), MemberRelationshipStatus.REQUEST_RECEIVED);
        }
        return statuses;
    }

    private MemberRelationshipStatus getRelationshipStatus(
            Long targetMemberId,
            Set<Long> friendIds,
            Map<Long, MemberRelationshipStatus> requestStatuses
    ) {
        if (friendIds.contains(targetMemberId)) {
            return MemberRelationshipStatus.FRIEND;
        }
        return requestStatuses.getOrDefault(targetMemberId, MemberRelationshipStatus.NONE);
    }
}
