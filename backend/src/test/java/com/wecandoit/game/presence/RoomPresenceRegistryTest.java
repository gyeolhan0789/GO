package com.wecandoit.game.presence;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("방 Presence Registry")
class RoomPresenceRegistryTest {

    private final RoomPresenceRegistry registry = new RoomPresenceRegistry();

    @Test
    @DisplayName("첫 구독이면 입장 이벤트와 현재 접속 목록을 반환한다")
    void subscribesFirstPresence() {
        // when
        RoomPresenceRegistry.Change change = registry.subscribe(10L, 1L, "session-1", "sub-1");

        // then
        assertThat(change.type()).isEqualTo(RoomPresenceEventType.JOINED);
        assertThat(change.roomId()).isEqualTo(10L);
        assertThat(change.memberId()).isEqualTo(1L);
        assertThat(change.onlineMemberIds()).containsExactly(1L);
    }

    @Test
    @DisplayName("같은 회원의 중복 구독은 접속 수를 늘리지 않고 동기화 이벤트를 반환한다")
    void subscribesDuplicateMemberPresenceAsSync() {
        // given
        registry.subscribe(10L, 1L, "session-1", "sub-1");

        // when
        RoomPresenceRegistry.Change change = registry.subscribe(10L, 1L, "session-2", "sub-2");

        // then
        assertThat(change.type()).isEqualTo(RoomPresenceEventType.SYNC);
        assertThat(change.onlineMemberIds()).containsExactly(1L);
    }

    @Test
    @DisplayName("하나의 세션 구독만 해제되고 다른 세션이 남아 있으면 퇴장 이벤트를 반환하지 않는다")
    void doesNotLeaveWhenAnotherSessionRemains() {
        // given
        registry.subscribe(10L, 1L, "session-1", "sub-1");
        registry.subscribe(10L, 1L, "session-2", "sub-2");

        // when & then
        assertThat(registry.unsubscribe("session-1", "sub-1")).isEmpty();
    }

    @Test
    @DisplayName("마지막 구독이 해제되면 퇴장 이벤트와 최신 접속 목록을 반환한다")
    void leavesWhenLastSubscriptionIsRemoved() {
        // given
        registry.subscribe(10L, 1L, "session-1", "sub-1");
        registry.subscribe(10L, 2L, "session-2", "sub-2");

        // when
        RoomPresenceRegistry.Change change = registry.unsubscribe("session-1", "sub-1").orElseThrow();

        // then
        assertThat(change.type()).isEqualTo(RoomPresenceEventType.LEFT);
        assertThat(change.memberId()).isEqualTo(1L);
        assertThat(change.onlineMemberIds()).containsExactly(2L);
    }

    @Test
    @DisplayName("연결이 끊기면 해당 세션의 모든 방 Presence 구독을 제거한다")
    void disconnectsAllPresenceSubscriptionsInSession() {
        // given
        registry.subscribe(10L, 1L, "session-1", "sub-1");
        registry.subscribe(20L, 1L, "session-1", "sub-2");
        registry.subscribe(10L, 2L, "session-2", "sub-3");

        // when
        List<RoomPresenceRegistry.Change> changes = registry.disconnect("session-1");

        // then
        assertThat(changes)
                .extracting(RoomPresenceRegistry.Change::roomId)
                .containsExactlyInAnyOrder(10L, 20L);
        assertThat(changes)
                .extracting(RoomPresenceRegistry.Change::type)
                .containsOnly(RoomPresenceEventType.LEFT);
    }
}
