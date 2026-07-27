package com.wecandoit.member.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.repository.FriendRequestRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.dto.MemberRelationshipStatus;
import com.wecandoit.member.dto.MemberSearchResponse;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberReadService {

    private final MemberRepository memberRepository;
    private final FriendRepository friendRepository;
    private final FriendRequestRepository friendRequestRepository;

    public SliceResponse<MemberSearchResponse> searchMembers(
            Long memberId,
            String keyword,
            Pageable pageable
    ) {
        if (keyword == null || keyword.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "검색어는 필수입니다.");
        }

        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Slice<Member> members = memberRepository
                .findByNicknameContainingIgnoreCaseAndIdNotOrderByNicknameAscIdAsc(
                        keyword.trim(),
                        memberId,
                        fixedPageable
                );
        if (members.isEmpty()) {
            return SliceResponse.from(members.map(member -> MemberSearchResponse.of(
                    member,
                    MemberRelationshipStatus.NONE
            )));
        }

        Set<Long> candidateIds = members.getContent().stream()
                .map(Member::getId)
                .collect(Collectors.toSet());
        Set<Long> friendIds = new HashSet<>(
                friendRepository.findFriendMemberIds(memberId, candidateIds)
        );
        Map<Long, MemberRelationshipStatus> requestStatuses = getRequestStatuses(memberId, candidateIds);

        Slice<MemberSearchResponse> responses = members
                .map(member -> MemberSearchResponse.of(
                        member,
                        getRelationshipStatus(member.getId(), friendIds, requestStatuses)
                ));
        return SliceResponse.from(responses);
    }

    public Map<Long, String> getNicknamesByIds(Collection<Long> memberIds) {
        Set<Long> targetMemberIds = new HashSet<>(memberIds);
        if (targetMemberIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, String> nicknamesById = memberRepository.findAllById(targetMemberIds).stream()
                .collect(Collectors.toMap(Member::getId, Member::getNickname));
        if (nicknamesById.size() != targetMemberIds.size()) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return nicknamesById;
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
