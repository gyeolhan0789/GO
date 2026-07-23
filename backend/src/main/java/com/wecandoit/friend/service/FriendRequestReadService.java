package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.FriendRequestStatus;
import com.wecandoit.friend.repository.FriendRequestRepository;

import com.wecandoit.friend.dto.ReceivedFriendRequestResponse;
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
