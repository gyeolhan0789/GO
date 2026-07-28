package com.wecandoit.game.controller.response;

import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.domain.GameRequest;
import java.time.LocalDateTime;

public record ReceivedGameRequestResponse(
        Long requestId,
        Long roomId,
        Long inviterId,
        String inviterNickname,
        RequestStatus status,
        LocalDateTime createdAt
) {

    public static ReceivedGameRequestResponse from(GameRequest gameRequest, String inviterNickname) {
        return new ReceivedGameRequestResponse(
                gameRequest.getId(),
                gameRequest.getRoomId(),
                gameRequest.getInviterId(),
                inviterNickname,
                gameRequest.getStatus(),
                gameRequest.getCreatedAt()
        );
    }
}
