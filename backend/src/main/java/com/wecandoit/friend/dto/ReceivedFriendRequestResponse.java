package com.wecandoit.friend.dto;

import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.item.controller.response.EquippedItemResponse;
import com.wecandoit.member.domain.Gender;
import java.time.LocalDateTime;
import java.util.List;

public record ReceivedFriendRequestResponse(
        Long requestId,
        Long inviterId,
        String inviterNickname,
        LocalDateTime createdAt,
        Gender gender,
        String defaultImageUrl,
        List<EquippedItemResponse> equippedItems
) {

    public static ReceivedFriendRequestResponse of(
            FriendRequest friendRequest,
            String defaultImageUrl,
            List<EquippedItemResponse> equippedItems
    ) {
        return new ReceivedFriendRequestResponse(
                friendRequest.getId(),
                friendRequest.getInviterId(),
                friendRequest.getInviter().getNickname(),
                friendRequest.getCreatedAt(),
                friendRequest.getInviter().getGender(),
                defaultImageUrl,
                equippedItems
        );
    }
}
