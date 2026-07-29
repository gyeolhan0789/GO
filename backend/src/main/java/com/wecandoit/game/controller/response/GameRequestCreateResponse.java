package com.wecandoit.game.controller.response;

import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.domain.GameRequest;

public record GameRequestCreateResponse(
        Long requestId,
        RequestStatus status,
        boolean created
) {

    public static GameRequestCreateResponse from(GameRequest gameRequest, boolean created) {
        return new GameRequestCreateResponse(
                gameRequest.getId(),
                gameRequest.getStatus(),
                created
        );
    }
}
