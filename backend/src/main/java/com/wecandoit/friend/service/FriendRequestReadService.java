package com.wecandoit.friend.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.friend.domain.FriendRequestStatus;
import com.wecandoit.friend.dto.ReceivedFriendRequestResponse;
import com.wecandoit.friend.dto.SentFriendRequestResponse;
import com.wecandoit.friend.repository.FriendRequestRepository;
import com.wecandoit.member.repository.MemberRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendRequestReadService {

    private final FriendRequestRepository friendRequestRepository;
    private final MemberRepository memberRepository;

    public List<ReceivedFriendRequestResponse> getReceivedRequests(Long memberId) {
        return friendRequestRepository
                .findAllByInviteeIdAndStatusOrderByCreatedAtDesc(memberId, FriendRequestStatus.PENDING)
                .stream()
                .map(ReceivedFriendRequestResponse::from)
                .toList();
    }

    public List<SentFriendRequestResponse> getSentRequests(Long memberId) {
        if (!memberRepository.existsById(memberId)) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return friendRequestRepository.findPendingSentRequests(memberId).stream()
                .map(SentFriendRequestResponse::from)
                .toList();
    }
}
