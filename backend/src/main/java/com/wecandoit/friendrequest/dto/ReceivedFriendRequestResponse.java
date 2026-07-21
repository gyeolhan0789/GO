package com.wecandoit.friendrequest.dto;

import com.wecandoit.friendrequest.domain.FriendRequest;
import java.time.LocalDateTime;

public record ReceivedFriendRequestResponse(
        Long requestId,
        Long inviterId,
        String inviterNickname,
        LocalDateTime createdAt
) {

    public static ReceivedFriendRequestResponse from(FriendRequest friendRequest) {
        return new ReceivedFriendRequestResponse(
                friendRequest.getId(),
                friendRequest.getInviter().getId(),
                friendRequest.getInviter().getNickname(),
                friendRequest.getCreatedAt()
        );
    }
}
