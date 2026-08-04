package com.wecandoit.history.controller.response;

import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.history.domain.WalkSession;
import java.time.Instant;
import java.util.List;

public record WalkSessionDetailResponse(
        Long walkSessionId,
        Long roomId,
        String roomName,
        GameMode mode,
        Instant startedAt,
        Instant endedAt,
        long durationSeconds,
        int step,
        int distance,
        int calories,
        Long initialBingoBoardId,
        int achievedMissionCount,
        List<WalkSessionBingoBoardResponse> bingoBoards
) {

    public static WalkSessionDetailResponse of(
            WalkSession walkSession,
            Room room,
            int achievedMissionCount,
            List<WalkSessionBingoBoardResponse> bingoBoards
    ) {
        return new WalkSessionDetailResponse(
                walkSession.getId(),
                walkSession.getRoomId(),
                room.getName(),
                room.getMode(),
                walkSession.getStartedAt(),
                walkSession.getEndedAt(),
                walkSession.getDurationSeconds(),
                walkSession.getStep(),
                walkSession.getDistance(),
                walkSession.getCalories(),
                walkSession.getInitialBingoBoardId(),
                achievedMissionCount,
                bingoBoards
        );
    }
}
