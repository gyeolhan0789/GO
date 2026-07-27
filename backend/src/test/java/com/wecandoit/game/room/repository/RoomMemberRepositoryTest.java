package com.wecandoit.game.room.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.game.room.domain.RoomMember;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("게임방 참여자 저장소")
class RoomMemberRepositoryTest {

    @Autowired
    private RoomMemberRepository roomMemberRepository;

    @Test
    @DisplayName("게임방에 참여 중인 인원수를 조회한다")
    void countByRoomIdReturnsParticipantCount() {
        // given
        roomMemberRepository.save(RoomMember.create(10L, 1L));
        roomMemberRepository.save(RoomMember.create(10L, 2L));
        roomMemberRepository.save(RoomMember.create(20L, 3L));

        // when
        long participantCount = roomMemberRepository.countByRoomId(10L);

        // then
        assertThat(participantCount).isEqualTo(2L);
    }
}
