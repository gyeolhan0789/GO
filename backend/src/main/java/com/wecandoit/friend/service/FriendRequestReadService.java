package com.wecandoit.friend.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.PageResponse;
import com.wecandoit.friend.domain.FriendRequestStatus;
import com.wecandoit.friend.dto.ReceivedFriendRequestResponse;
import com.wecandoit.friend.dto.SentFriendRequestResponse;
import com.wecandoit.friend.repository.FriendRequestRepository;
import com.wecandoit.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendRequestReadService {

    private final FriendRequestRepository friendRequestRepository;
    private final MemberRepository memberRepository;

    public PageResponse<ReceivedFriendRequestResponse> getReceivedRequests(
            Long memberId,
            Pageable pageable
    ) {
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<ReceivedFriendRequestResponse> requests = friendRequestRepository
                .findAllByInviteeIdAndStatusOrderByCreatedAtDescIdDesc(
                        memberId,
                        FriendRequestStatus.PENDING,
                        fixedPageable
                )
                .map(ReceivedFriendRequestResponse::from);
        return PageResponse.from(requests);
    }

    public PageResponse<SentFriendRequestResponse> getSentRequests(
            Long memberId,
            Pageable pageable
    ) {
        if (!memberRepository.existsById(memberId)) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        Pageable fixedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<SentFriendRequestResponse> requests = friendRequestRepository
                .findPendingSentRequests(memberId, fixedPageable)
                .map(SentFriendRequestResponse::from);
        return PageResponse.from(requests);
    }
}
