package com.wecandoit.history.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.groups.Tuple.tuple;

import com.wecandoit.common.testcontainers.MySqlDataJpaTest;
import com.wecandoit.history.domain.MemberHistory;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

@MySqlDataJpaTest
@DisplayName("회원 히스토리 저장소")
class MemberHistoryRepositoryTest {

    @Autowired
    private MemberHistoryRepository memberHistoryRepository;

    @Test
    @DisplayName("회원 히스토리를 저장한다")
    void saveMemberHistory() {
        // given
        LocalDate historyDate = LocalDate.of(2026, 7, 22);

        // when
        MemberHistory memberHistory = memberHistoryRepository.saveAndFlush(
                MemberHistory.create(1L, historyDate, 10, 1_000, 100)
        );

        // then
        assertThat(memberHistory.getId()).isNotNull();
        assertThat(memberHistory.getMemberId()).isEqualTo(1L);
        assertThat(memberHistory.getHistoryDate()).isEqualTo(historyDate);
        assertThat(memberHistory.getStep()).isEqualTo(10);
        assertThat(memberHistory.getDistance()).isEqualTo(1_000);
        assertThat(memberHistory.getCalories()).isEqualTo(100);
        assertThat(memberHistory.getCreatedAt()).isNotNull();
        assertThat(memberHistory.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("같은 회원의 같은 날짜 히스토리는 중복 저장할 수 없다")
    void saveRejectsDuplicateMemberHistoryDate() {
        // given
        LocalDate historyDate = LocalDate.of(2026, 7, 22);
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, historyDate, 10, 1_000, 100));

        // when & then
        assertThatThrownBy(() -> memberHistoryRepository.saveAndFlush(
                MemberHistory.create(1L, historyDate, 20, 2_000, 200)
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("같은 회원의 다른 날짜 히스토리는 저장할 수 있다")
    void saveAllowsDifferentHistoryDate() {
        // given
        memberHistoryRepository.saveAndFlush(
                MemberHistory.create(1L, LocalDate.of(2026, 7, 22), 10, 1_000, 100)
        );

        // when
        MemberHistory memberHistory = memberHistoryRepository.saveAndFlush(
                MemberHistory.create(1L, LocalDate.of(2026, 7, 23), 20, 2_000, 200)
        );

        // then
        assertThat(memberHistory.getId()).isNotNull();
        assertThat(memberHistory.getMemberId()).isEqualTo(1L);
        assertThat(memberHistory.getStep()).isEqualTo(20);
    }

    @Test
    @DisplayName("다른 회원의 같은 날짜 히스토리는 저장할 수 있다")
    void saveAllowsDifferentMember() {
        // given
        LocalDate historyDate = LocalDate.of(2026, 7, 22);
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, historyDate, 10, 1_000, 100));

        // when
        MemberHistory memberHistory = memberHistoryRepository.saveAndFlush(
                MemberHistory.create(2L, historyDate, 20, 2_000, 200)
        );

        // then
        assertThat(memberHistory.getId()).isNotNull();
        assertThat(memberHistory.getMemberId()).isEqualTo(2L);
        assertThat(memberHistory.getHistoryDate()).isEqualTo(historyDate);
    }

    @Test
    @DisplayName("회원 ID와 히스토리 날짜로 히스토리를 조회한다")
    void findByMemberIdAndHistoryDateReturnsHistory() {
        // given
        LocalDate historyDate = LocalDate.of(2026, 7, 22);
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, historyDate, 10, 1_000, 100));

        // when
        Optional<MemberHistory> foundMemberHistory = memberHistoryRepository.findByMemberIdAndHistoryDate(
                1L,
                historyDate
        );

        // then
        assertThat(foundMemberHistory).isPresent();
        assertThat(foundMemberHistory.get().getMemberId()).isEqualTo(1L);
        assertThat(foundMemberHistory.get().getHistoryDate()).isEqualTo(historyDate);
        assertThat(foundMemberHistory.get().getStep()).isEqualTo(10);
    }

    @Test
    @DisplayName("회원 ID와 날짜 범위로 히스토리를 날짜 오름차순 조회한다")
    void findAllByMemberIdAndHistoryDateBetweenReturnsHistoriesOrderByHistoryDate() {
        // given
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, LocalDate.of(2026, 7, 23), 30, 3_000, 300));
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, LocalDate.of(2026, 7, 21), 10, 1_000, 100));
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, LocalDate.of(2026, 7, 22), 20, 2_000, 200));

        // when
        List<MemberHistory> memberHistories = memberHistoryRepository
                .findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(
                        1L,
                        LocalDate.of(2026, 7, 21),
                        LocalDate.of(2026, 7, 23)
                );

        // then
        assertThat(memberHistories)
                .extracting(MemberHistory::getHistoryDate)
                .containsExactly(
                        LocalDate.of(2026, 7, 21),
                        LocalDate.of(2026, 7, 22),
                        LocalDate.of(2026, 7, 23)
                );
    }

    @Test
    @DisplayName("다른 회원의 히스토리는 범위 조회 결과에 포함하지 않는다")
    void findAllByMemberIdAndHistoryDateBetweenExcludesOtherMemberHistories() {
        // given
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, LocalDate.of(2026, 7, 22), 10, 1_000, 100));
        memberHistoryRepository.saveAndFlush(MemberHistory.create(2L, LocalDate.of(2026, 7, 22), 20, 2_000, 200));

        // when
        List<MemberHistory> memberHistories = memberHistoryRepository
                .findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(
                        1L,
                        LocalDate.of(2026, 7, 21),
                        LocalDate.of(2026, 7, 23)
                );

        // then
        assertThat(memberHistories).hasSize(1);
        assertThat(memberHistories.getFirst().getMemberId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("날짜 범위 밖 히스토리는 범위 조회 결과에 포함하지 않는다")
    void findAllByMemberIdAndHistoryDateBetweenExcludesOutOfRangeHistories() {
        // given
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, LocalDate.of(2026, 7, 20), 10, 1_000, 100));
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, LocalDate.of(2026, 7, 22), 20, 2_000, 200));
        memberHistoryRepository.saveAndFlush(MemberHistory.create(1L, LocalDate.of(2026, 7, 24), 30, 3_000, 300));

        // when
        List<MemberHistory> memberHistories = memberHistoryRepository
                .findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(
                        1L,
                        LocalDate.of(2026, 7, 21),
                        LocalDate.of(2026, 7, 23)
                );

        // then
        assertThat(memberHistories).hasSize(1);
        assertThat(memberHistories.getFirst().getHistoryDate()).isEqualTo(LocalDate.of(2026, 7, 22));
    }

    @Test
    @DisplayName("여러 회원의 기간 내 히스토리를 회원과 날짜 오름차순으로 조회한다")
    void findAllByMemberIdsAndHistoryDateBetweenReturnsOrderedHistories() {
        // given
        memberHistoryRepository.saveAndFlush(
                MemberHistory.create(2L, LocalDate.of(2026, 7, 22), 20, 2_000, 200)
        );
        memberHistoryRepository.saveAndFlush(
                MemberHistory.create(1L, LocalDate.of(2026, 7, 23), 30, 3_000, 300)
        );
        memberHistoryRepository.saveAndFlush(
                MemberHistory.create(1L, LocalDate.of(2026, 7, 21), 10, 1_000, 100)
        );
        memberHistoryRepository.saveAndFlush(
                MemberHistory.create(3L, LocalDate.of(2026, 7, 22), 40, 4_000, 400)
        );

        // when
        List<MemberHistory> memberHistories = memberHistoryRepository
                .findAllByMemberIdInAndHistoryDateBetweenOrderByMemberIdAscHistoryDateAsc(
                        List.of(1L, 2L),
                        LocalDate.of(2026, 7, 21),
                        LocalDate.of(2026, 7, 23)
                );

        // then
        assertThat(memberHistories)
                .extracting(MemberHistory::getMemberId, MemberHistory::getHistoryDate)
                .containsExactly(
                        tuple(1L, LocalDate.of(2026, 7, 21)),
                        tuple(1L, LocalDate.of(2026, 7, 23)),
                        tuple(2L, LocalDate.of(2026, 7, 22))
                );
    }
}
