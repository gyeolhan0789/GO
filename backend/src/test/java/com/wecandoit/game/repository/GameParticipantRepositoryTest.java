package com.wecandoit.game.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.common.testcontainers.MySqlDataJpaTest;
import com.wecandoit.game.domain.GameParticipant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

@MySqlDataJpaTest
@DisplayName("게임 참가자 저장소")
class GameParticipantRepositoryTest {

    @Autowired
    private GameParticipantRepository gameParticipantRepository;

    @Test
    @DisplayName("같은 회원은 서로 다른 게임 회차에 참여할 수 있다")
    void saveMemberInMultipleGames() {
        gameParticipantRepository.save(GameParticipant.create(100L, 1L));
        gameParticipantRepository.save(GameParticipant.create(101L, 1L));

        gameParticipantRepository.flush();

        assertThat(gameParticipantRepository.findAll()).hasSize(2);
    }

    @Test
    @DisplayName("같은 게임 회차에 동일 회원을 중복 저장할 수 없다")
    void rejectDuplicateMemberInSameGame() {
        gameParticipantRepository.saveAndFlush(GameParticipant.create(100L, 1L));

        assertThatThrownBy(() -> gameParticipantRepository.saveAndFlush(
                GameParticipant.create(100L, 1L)
        )).isInstanceOf(DataIntegrityViolationException.class);
    }
}
