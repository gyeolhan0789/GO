package com.wecandoit.history.controller.response;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.history.domain.ActiveWalkSession;
import java.time.Instant;
import java.util.UUID;

public record WalkSessionStartResponse(
        UUID walkSessionKey,
        Long roomId,
        String roomName,
        GameMode mode,
        Long initialBingoBoardId,
        Instant startedAt,
        Instant expiresAt
) {

    public static WalkSessionStartResponse of(ActiveWalkSession activeWalkSession, Room room) {
        return new WalkSessionStartResponse(
                UUID.fromString(activeWalkSession.getWalkSessionKey()),
                activeWalkSession.getRoomId(),
                room.getName(),
                room.getMode(),
                activeWalkSession.getInitialBingoBoardId(),
                activeWalkSession.getStartedAt(),
                activeWalkSession.getExpiresAt()
        );
    }
}
