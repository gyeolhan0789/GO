package com.wecandoit.game.request.controller.response;

import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.request.domain.GameRequest;
import java.time.LocalDateTime;

public record SentGameRequestResponse(
        Long requestId,
        Long roomId,
        Long inviteeId,
        String inviteeNickname,
        RequestStatus status,
        LocalDateTime createdAt
) {

    public static SentGameRequestResponse from(GameRequest gameRequest, String inviteeNickname) {
        return new SentGameRequestResponse(
                gameRequest.getId(),
                gameRequest.getRoomId(),
                gameRequest.getInviteeId(),
                inviteeNickname,
                gameRequest.getStatus(),
                gameRequest.getCreatedAt()
        );
    }
}
