package com.wecandoit.friendrequest.service;

import com.wecandoit.friendrequest.domain.FriendRequestStatus;
import com.wecandoit.friendrequest.repository.FriendRequestRepository;

import com.wecandoit.friendrequest.dto.ReceivedFriendRequestResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendRequestReadService {

    private final FriendRequestRepository friendRequestRepository;

    public List<ReceivedFriendRequestResponse> getReceivedRequests(Long memberId) {
        return friendRequestRepository
                .findAllByInviteeIdAndStatusOrderByCreatedAtDesc(memberId, FriendRequestStatus.PENDING)
                .stream()
                .map(ReceivedFriendRequestResponse::from)
                .toList();
    }
}
