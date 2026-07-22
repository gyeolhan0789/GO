package com.wecandoit.history.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.history.domain.MemberHistory;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
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

        // when, then
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
}
