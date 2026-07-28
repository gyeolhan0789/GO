package com.wecandoit.friend.dto;

import com.wecandoit.friend.domain.FriendRequest;
import java.time.LocalDateTime;

public record SentFriendRequestResponse(
        Long requestId,
        Long inviteeId,
        String inviteeNickname,
        LocalDateTime createdAt
) {

    public static SentFriendRequestResponse from(FriendRequest friendRequest) {
        return new SentFriendRequestResponse(
                friendRequest.getId(),
                friendRequest.getInvitee().getId(),
                friendRequest.getInvitee().getNickname(),
                friendRequest.getCreatedAt()
        );
    }
}
