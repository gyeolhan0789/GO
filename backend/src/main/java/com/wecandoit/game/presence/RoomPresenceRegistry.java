package com.wecandoit.game.presence;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class RoomPresenceRegistry {

    private final Map<String, Map<String, Subscription>> subscriptionsBySessionId = new HashMap<>();
    private final Map<Long, Map<Long, Set<SubscriptionKey>>> subscriptionsByRoomMember = new HashMap<>();

    public synchronized Change subscribe(
            Long roomId,
            Long memberId,
            String sessionId,
            String subscriptionId
    ) {
        removeSubscription(sessionId, subscriptionId);

        boolean alreadyOnline = isOnline(roomId, memberId);
        Subscription subscription = new Subscription(roomId, memberId, sessionId, subscriptionId);
        subscriptionsBySessionId
                .computeIfAbsent(sessionId, ignored -> new HashMap<>())
                .put(subscriptionId, subscription);
        subscriptionsByRoomMember
                .computeIfAbsent(roomId, ignored -> new HashMap<>())
                .computeIfAbsent(memberId, ignored -> new HashSet<>())
                .add(new SubscriptionKey(sessionId, subscriptionId));

        RoomPresenceEventType type = alreadyOnline
                ? RoomPresenceEventType.SYNC
                : RoomPresenceEventType.JOINED;
        return change(type, roomId, memberId);
    }

    public synchronized Optional<Change> unsubscribe(String sessionId, String subscriptionId) {
        Subscription subscription = removeSubscription(sessionId, subscriptionId);
        if (subscription == null || isOnline(subscription.roomId(), subscription.memberId())) {
            return Optional.empty();
        }
        return Optional.of(change(
                RoomPresenceEventType.LEFT,
                subscription.roomId(),
                subscription.memberId()
        ));
    }

    public synchronized List<Change> disconnect(String sessionId) {
        Map<String, Subscription> sessionSubscriptions = subscriptionsBySessionId.remove(sessionId);
        if (sessionSubscriptions == null || sessionSubscriptions.isEmpty()) {
            return List.of();
        }

        Set<RoomMemberKey> affectedRoomMembers = new HashSet<>();
        sessionSubscriptions.values().forEach(subscription -> {
            removeRoomMemberSubscription(subscription);
            affectedRoomMembers.add(new RoomMemberKey(subscription.roomId(), subscription.memberId()));
        });

        return affectedRoomMembers.stream()
                .filter(roomMember -> !isOnline(roomMember.roomId(), roomMember.memberId()))
                .map(roomMember -> change(
                        RoomPresenceEventType.LEFT,
                        roomMember.roomId(),
                        roomMember.memberId()
                ))
                .toList();
    }

    private Subscription removeSubscription(String sessionId, String subscriptionId) {
        Map<String, Subscription> sessionSubscriptions = subscriptionsBySessionId.get(sessionId);
        if (sessionSubscriptions == null) {
            return null;
        }

        Subscription subscription = sessionSubscriptions.remove(subscriptionId);
        if (sessionSubscriptions.isEmpty()) {
            subscriptionsBySessionId.remove(sessionId);
        }
        if (subscription != null) {
            removeRoomMemberSubscription(subscription);
        }
        return subscription;
    }

    private void removeRoomMemberSubscription(Subscription subscription) {
        Map<Long, Set<SubscriptionKey>> memberSubscriptions =
                subscriptionsByRoomMember.get(subscription.roomId());
        if (memberSubscriptions == null) {
            return;
        }

        Set<SubscriptionKey> subscriptionKeys = memberSubscriptions.get(subscription.memberId());
        if (subscriptionKeys == null) {
            return;
        }

        subscriptionKeys.remove(new SubscriptionKey(subscription.sessionId(), subscription.subscriptionId()));
        if (subscriptionKeys.isEmpty()) {
            memberSubscriptions.remove(subscription.memberId());
        }
        if (memberSubscriptions.isEmpty()) {
            subscriptionsByRoomMember.remove(subscription.roomId());
        }
    }

    private boolean isOnline(Long roomId, Long memberId) {
        Map<Long, Set<SubscriptionKey>> memberSubscriptions = subscriptionsByRoomMember.get(roomId);
        if (memberSubscriptions == null) {
            return false;
        }

        Set<SubscriptionKey> subscriptionKeys = memberSubscriptions.get(memberId);
        return subscriptionKeys != null && !subscriptionKeys.isEmpty();
    }

    private Change change(RoomPresenceEventType type, Long roomId, Long memberId) {
        return new Change(type, roomId, memberId, getOnlineMemberIds(roomId));
    }

    private List<Long> getOnlineMemberIds(Long roomId) {
        Map<Long, Set<SubscriptionKey>> memberSubscriptions = subscriptionsByRoomMember.get(roomId);
        if (memberSubscriptions == null || memberSubscriptions.isEmpty()) {
            return List.of();
        }

        return memberSubscriptions.entrySet().stream()
                .filter(entry -> !entry.getValue().isEmpty())
                .map(Map.Entry::getKey)
                .sorted(Comparator.naturalOrder())
                .toList();
    }

    public record Change(
            RoomPresenceEventType type,
            Long roomId,
            Long memberId,
            List<Long> onlineMemberIds
    ) {

        public Change {
            onlineMemberIds = List.copyOf(onlineMemberIds);
        }
    }

    private record Subscription(
            Long roomId,
            Long memberId,
            String sessionId,
            String subscriptionId
    ) {
    }

    private record SubscriptionKey(
            String sessionId,
            String subscriptionId
    ) {
    }

    private record RoomMemberKey(
            Long roomId,
            Long memberId
    ) {
    }
}
