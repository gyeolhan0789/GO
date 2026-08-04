package com.wecandoit.history.controller.response;

import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.history.domain.WalkSession;
import java.time.Instant;

public record WalkSessionResponse(
        Long walkSessionId,
        Long roomId,
        String roomName,
        GameMode mode,
        Instant startedAt,
        Instant endedAt,
        long durationSeconds,
        long activeDurationSeconds,
        int step,
        int distance,
        int calories,
        Long initialBingoBoardId,
        int achievedMissionCount
) {

    public static WalkSessionResponse of(
            WalkSession walkSession,
            Room room,
            int achievedMissionCount
    ) {
        return new WalkSessionResponse(
                walkSession.getId(),
                walkSession.getRoomId(),
                room.getName(),
                room.getMode(),
                walkSession.getStartedAt(),
                walkSession.getEndedAt(),
                walkSession.getDurationSeconds(),
                walkSession.getActiveDurationSeconds(),
                walkSession.getStep(),
                walkSession.getDistance(),
                walkSession.getCalories(),
                walkSession.getInitialBingoBoardId(),
                achievedMissionCount
        );
    }
}
