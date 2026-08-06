package com.wecandoit.game.event;

public record BattleMatchingMessageRequestedEvent(
        Long recipientMemberId,
        BattleMatchingMessage message
) {
}
