package com.wecandoit.game.presence;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class RoomPresenceDestination {

    private static final String ROOM_TOPIC_PREFIX = "/topic/rooms/";
    private static final String PRESENCE_TOPIC_SUFFIX = "/presence";
    private static final Pattern PRESENCE_DESTINATION_PATTERN =
            Pattern.compile("^/topic/rooms/(\\d+)/presence$");

    private RoomPresenceDestination() {
    }

    static Optional<Long> extractRoomId(String destination) {
        if (destination == null) {
            return Optional.empty();
        }

        Matcher matcher = PRESENCE_DESTINATION_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            return Optional.empty();
        }
        return Optional.of(Long.parseLong(matcher.group(1)));
    }

    static String destination(Long roomId) {
        return ROOM_TOPIC_PREFIX + roomId + PRESENCE_TOPIC_SUFFIX;
    }
}
