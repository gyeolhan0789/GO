package com.wecandoit.game.event;

public record BattleMatchingMessage(
        BattleMatchingEventType type,
        Long roomId,
        Long requestId,
        Long hostId,
        Long inviteeId,
        Integer countdownSeconds
) {

    private static final int BATTLE_COUNTDOWN_SECONDS = 3;

    public static BattleMatchingMessage invitationRejected(
            Long roomId,
            Long requestId,
            Long hostId,
            Long inviteeId
    ) {
        return new BattleMatchingMessage(
                BattleMatchingEventType.INVITATION_REJECTED,
                roomId,
                requestId,
                hostId,
                inviteeId,
                null
        );
    }

    public static BattleMatchingMessage invitationCancelled(
            Long roomId,
            Long requestId,
            Long hostId,
            Long inviteeId
    ) {
        return new BattleMatchingMessage(
                BattleMatchingEventType.INVITATION_CANCELLED,
                roomId,
                requestId,
                hostId,
                inviteeId,
                null
        );
    }

    public static BattleMatchingMessage battleCountdownStarted(
            Long roomId,
            Long requestId,
            Long hostId,
            Long inviteeId
    ) {
        return new BattleMatchingMessage(
                BattleMatchingEventType.BATTLE_COUNTDOWN_STARTED,
                roomId,
                requestId,
                hostId,
                inviteeId,
                BATTLE_COUNTDOWN_SECONDS
        );
    }
}
