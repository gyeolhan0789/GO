package com.wecandoit.game.result.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.game.result.domain.GameResult;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
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
    @DisplayName("방 ID로 게임 결과를 조회한다")
    void findByRoomIdFindsResult() {
        // given
        GameResult gameResult = gameResultRepository.save(GameResult.create(10L, true, 3, 9, 500L));

        // when
        Optional<GameResult> found = gameResultRepository.findByRoomId(10L);

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(gameResult.getId());
    }

    @Test
    @DisplayName("해당 방의 게임 결과가 없으면 빈 값을 반환한다")
    void findByRoomIdReturnsEmptyWhenMissing() {
        // when
        Optional<GameResult> found = gameResultRepository.findByRoomId(999L);

        // then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("방 ID 목록에 속한 게임 결과를 최신순으로 슬라이스 조회한다")
    void findByRoomIdInOrderByCreatedAtDescReturnsSliceOrderedByLatest() {
        // given
        GameResult oldest = gameResultRepository.saveAndFlush(GameResult.create(10L, true, 3, 9, 500L));
        GameResult middle = gameResultRepository.saveAndFlush(GameResult.create(20L, true, 3, 9, 500L));
        GameResult latest = gameResultRepository.saveAndFlush(GameResult.create(30L, true, 3, 9, 500L));
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
        gameResultRepository.save(GameResult.create(10L, true, 3, 9, 500L));

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
