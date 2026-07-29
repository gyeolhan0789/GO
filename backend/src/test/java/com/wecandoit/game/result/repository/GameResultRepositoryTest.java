package com.wecandoit.game.result.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.game.domain.GameResult;
import java.time.LocalDateTime;
import java.util.List;

import com.wecandoit.game.repository.GameResultRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("게임 결과 저장소")
class GameResultRepositoryTest {

    @Autowired
    private GameResultRepository gameResultRepository;
    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("같은 게임방의 결과를 두 번 저장하면 유니크 제약으로 차단한다")
    void saveRejectsDuplicateGameResult() {
        // given
        gameResultRepository.saveAndFlush(GameResult.create(100L, 10L, true, 3, 3, 200L));

        // when & then
        assertThatThrownBy(() ->
                gameResultRepository.saveAndFlush(GameResult.create(100L, 10L, true, 3, 3, 200L))
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void savesMultipleGameResultsForTheSameRoom() {
        gameResultRepository.saveAndFlush(GameResult.create(100L, 10L, true, 3, 3, 200L));
        gameResultRepository.saveAndFlush(GameResult.create(101L, 10L, true, 4, 4, 200L));

        assertThat(gameResultRepository.findFirstByRoomIdOrderByCreatedAtDescIdDesc(10L))
                .get()
                .extracting(GameResult::getGameId)
                .isEqualTo(101L);
    }

    @Test
    @DisplayName("방 ID 목록에 속한 게임 결과를 최신순으로 슬라이스 조회한다")
    void findByRoomIdInOrderByCreatedAtDescReturnsSliceOrderedByLatest() {
        // given
        GameResult oldest = gameResultRepository.saveAndFlush(GameResult.create(100L, 10L, true, 3, 9, 200L));
        GameResult middle = gameResultRepository.saveAndFlush(GameResult.create(200L, 20L, true, 3, 9, 200L));
        GameResult latest = gameResultRepository.saveAndFlush(GameResult.create(300L, 30L, true, 3, 9, 200L));
        updateCreatedAt(oldest.getId(), LocalDateTime.of(2026, 7, 1, 0, 0));
        updateCreatedAt(middle.getId(), LocalDateTime.of(2026, 7, 2, 0, 0));
        updateCreatedAt(latest.getId(), LocalDateTime.of(2026, 7, 3, 0, 0));
        entityManager.clear();

        // when
        Slice<GameResult> slice = gameResultRepository.findByRoomIdInOrderByCreatedAtDesc(
                List.of(10L, 20L, 30L),
                PageRequest.of(0, 2)
        );

        // then
        assertThat(slice.getContent())
                .extracting(GameResult::getRoomId)
                .containsExactly(30L, 20L);
        assertThat(slice.hasNext()).isTrue();
    }

    @Test
    @DisplayName("마지막 페이지를 조회하면 다음 페이지가 없다고 표시한다")
    void findByRoomIdInOrderByCreatedAtDescReturnsNoNextOnLastPage() {
        // given
        gameResultRepository.save(GameResult.create(100L, 10L, true, 3, 9, 200L));

        // when
        Slice<GameResult> slice = gameResultRepository.findByRoomIdInOrderByCreatedAtDesc(
                List.of(10L),
                PageRequest.of(0, 10)
        );

        // then
        assertThat(slice.getContent()).hasSize(1);
        assertThat(slice.hasNext()).isFalse();
    }

    private void updateCreatedAt(Long gameResultId, LocalDateTime createdAt) {
        entityManager.createQuery("""
                        update GameResult gr
                        set gr.createdAt = :createdAt
                        where gr.id = :gameResultId
                        """)
                .setParameter("createdAt", createdAt)
                .setParameter("gameResultId", gameResultId)
                .executeUpdate();
    }
}
