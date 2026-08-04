package com.wecandoit.history.controller.response;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.history.domain.WalkSession;
import java.time.Instant;

public record WalkSessionCompleteResponse(
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
        int achievedMissionCount,
        long earnedPoint
) {

    public static WalkSessionCompleteResponse of(
            WalkSession walkSession,
            Room room,
            int achievedMissionCount,
            long earnedPoint
    ) {
        return new WalkSessionCompleteResponse(
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
                achievedMissionCount,
                earnedPoint
        );
    }
}
