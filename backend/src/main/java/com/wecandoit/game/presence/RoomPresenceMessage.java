package com.wecandoit.game.presence;

import java.util.List;

public record RoomPresenceMessage(
        RoomPresenceEventType type,
        Long roomId,
        Long memberId,
        int onlineCount,
        List<RoomPresenceMember> onlineMembers
) {
}
