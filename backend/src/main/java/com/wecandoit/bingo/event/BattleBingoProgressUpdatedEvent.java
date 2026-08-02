package com.wecandoit.bingo.event;

public record BattleBingoProgressUpdatedEvent(
        Long roomId,
        Long gameId,
        Long participantMemberId,
        Long bingoBoardId,
        int approvedCellCount,
        int completedBingoCount,
        boolean targetReached
) {
}
