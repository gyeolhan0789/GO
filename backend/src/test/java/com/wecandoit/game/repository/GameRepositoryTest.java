package com.wecandoit.game.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameStatus;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("게임 저장소")
class GameRepositoryTest {

    @Autowired
    private GameRepository gameRepository;

    @Test
    @DisplayName("같은 방의 여러 회차 중 활성 게임을 조회한다")
    void savesMultipleGamesForTheSameRoomAndFindsTheActiveGame() {
        Game firstGame = gameRepository.saveAndFlush(Game.start(10L));
        firstGame.complete();
        gameRepository.saveAndFlush(firstGame);
        Game secondGame = gameRepository.saveAndFlush(Game.start(10L));

        Optional<Game> activeGame =
                gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(10L, GameStatus.ACTIVE);

        assertThat(activeGame).isPresent();
        assertThat(activeGame.get().getId()).isEqualTo(secondGame.getId());
        assertThat(firstGame.getCompletedAt()).isNotNull();
        assertThat(firstGame.getId()).isNotEqualTo(secondGame.getId());
    }
}
