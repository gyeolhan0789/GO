package com.wecandoit.friend.service;

import com.wecandoit.avatar.service.AvatarReadService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.domain.FriendRequestStatus;
import com.wecandoit.friend.dto.ReceivedFriendRequestResponse;
import com.wecandoit.friend.dto.SentFriendRequestResponse;
import com.wecandoit.friend.repository.FriendRequestRepository;
import com.wecandoit.item.controller.response.CharacterResponse;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendRequestReadService {

    private final FriendRequestRepository friendRequestRepository;
    private final MemberRepository memberRepository;
    private final AvatarReadService avatarReadService;

    public SliceResponse<ReceivedFriendRequestResponse> getReceivedRequests(
            Long memberId,
            Pageable pageable
    ) {
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Slice<FriendRequest> requests = friendRequestRepository
                .findAllByInviteeIdAndStatusOrderByCreatedAtDescIdDesc(
                        memberId,
                        FriendRequestStatus.PENDING,
                        fixedPageable
                );
        if (requests.isEmpty()) {
            return new SliceResponse<>(List.of(), false);
        }

        List<Member> inviters = requests.stream()
                .map(FriendRequest::getInviter)
                .toList();
        Map<Long, CharacterResponse> charactersByMemberId =
                avatarReadService.getAvatars(inviters);
        return SliceResponse.from(requests.map(request -> {
            CharacterResponse character = charactersByMemberId.get(request.getInviter().getId());
            return ReceivedFriendRequestResponse.of(
                    request,
                    character.defaultImageUrl(),
                    character.equippedItems()
            );
        }));
    }

    public SliceResponse<SentFriendRequestResponse> getSentRequests(
            Long memberId,
            Pageable pageable
    ) {
        if (!memberRepository.existsById(memberId)) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Slice<SentFriendRequestResponse> requests = friendRequestRepository
                .findPendingSentRequests(memberId, fixedPageable)
                .map(SentFriendRequestResponse::from);
        return SliceResponse.from(requests);
    }
}
