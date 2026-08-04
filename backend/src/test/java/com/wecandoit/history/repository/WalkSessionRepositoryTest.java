package com.wecandoit.history.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.history.domain.WalkSession;
import com.wecandoit.history.domain.WalkSessionBingoAchievement;
import java.time.Instant;
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
@DisplayName("산책 세션 저장소")
class WalkSessionRepositoryTest {

    @Autowired
    private WalkSessionRepository walkSessionRepository;
    @Autowired
    private WalkSessionBingoAchievementRepository achievementRepository;

    @Test
    @DisplayName("회원의 산책 세션을 종료 시각과 ID 역순으로 조회한다")
    void findAllByMemberReturnsLatestSessionsFirst() {
        // given
        WalkSession first = walkSessionRepository.save(session(
                1L,
                "11111111-1111-1111-1111-111111111111",
                Instant.parse("2026-08-03T01:00:00Z")
        ));
        WalkSession second = walkSessionRepository.save(session(
                1L,
                "22222222-2222-2222-2222-222222222222",
                Instant.parse("2026-08-03T02:00:00Z")
        ));
        walkSessionRepository.save(session(
                2L,
                "33333333-3333-3333-3333-333333333333",
                Instant.parse("2026-08-03T03:00:00Z")
        ));

        // when
        Slice<WalkSession> result = walkSessionRepository
                .findAllByMemberIdOrderByEndedAtDescIdDesc(1L, PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).extracting(WalkSession::getId)
                .containsExactly(second.getId(), first.getId());
        assertThat(result.hasNext()).isFalse();
    }

    @Test
    @DisplayName("회원과 방 ID로 해당 방의 산책 세션만 조회한다")
    void findAllByMemberAndRoomReturnsSpecifiedRoomSessions() {
        // given
        WalkSession expected = walkSessionRepository.save(session(
                1L,
                10L,
                "11111111-1111-1111-1111-111111111111",
                Instant.parse("2026-08-03T01:00:00Z")
        ));
        walkSessionRepository.save(session(
                1L,
                11L,
                "22222222-2222-2222-2222-222222222222",
                Instant.parse("2026-08-03T02:00:00Z")
        ));

        // when
        Slice<WalkSession> result = walkSessionRepository
                .findAllByMemberIdAndRoomIdOrderByEndedAtDescIdDesc(1L, 10L, PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).extracting(WalkSession::getId)
                .containsExactly(expected.getId());
    }

    @Test
    @DisplayName("같은 회원과 클라이언트 세션 키는 중복 저장할 수 없다")
    void saveRejectsDuplicateMemberClientSessionKey() {
        // given
        String clientSessionKey = "11111111-1111-1111-1111-111111111111";
        walkSessionRepository.saveAndFlush(session(
                1L,
                clientSessionKey,
                Instant.parse("2026-08-03T01:00:00Z")
        ));

        // when & then
        assertThatThrownBy(() -> walkSessionRepository.saveAndFlush(session(
                1L,
                clientSessionKey,
                Instant.parse("2026-08-03T02:00:00Z")
        ))).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("같은 세션과 빙고 셀의 성과는 중복 저장할 수 없다")
    void saveRejectsDuplicateSessionCellAchievement() {
        // given
        WalkSession walkSession = walkSessionRepository.saveAndFlush(session(
                1L,
                "11111111-1111-1111-1111-111111111111",
                Instant.parse("2026-08-03T01:00:00Z")
        ));
        Instant achievedAt = Instant.parse("2026-08-03T00:30:00Z");
        achievementRepository.saveAndFlush(WalkSessionBingoAchievement.create(
                walkSession.getId(),
                30L,
                40L,
                achievedAt
        ));

        // when & then
        assertThatThrownBy(() -> achievementRepository.saveAndFlush(
                WalkSessionBingoAchievement.create(walkSession.getId(), 30L, 40L, achievedAt)
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    private WalkSession session(Long memberId, String clientSessionKey, Instant endedAt) {
        return session(memberId, 10L, clientSessionKey, endedAt);
    }

    private WalkSession session(
            Long memberId,
            Long roomId,
            String clientSessionKey,
            Instant endedAt
    ) {
        return WalkSession.create(
                memberId,
                roomId,
                clientSessionKey,
                30L,
                endedAt.minusSeconds(600),
                endedAt,
                1_000,
                700,
                50
        );
    }
}
