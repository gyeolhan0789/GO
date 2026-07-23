package com.wecandoit.friend.dto;

import com.wecandoit.friend.domain.FriendRequest;
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
