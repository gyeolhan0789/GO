package com.wecandoit.history.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("회원 히스토리")
class MemberHistoryTest {

    @Test
    @DisplayName("히스토리 값을 누적한다")
    void addAccumulatesHistoryValues() {
        // given
        MemberHistory memberHistory = MemberHistory.create(
                1L,
                LocalDate.of(2026, 7, 23),
                1_000,
                700,
                50
        );

        // when
        memberHistory.add(500, 300, 20);

        // then
        assertThat(memberHistory.getStep()).isEqualTo(1_500);
        assertThat(memberHistory.getDistance()).isEqualTo(1_000);
        assertThat(memberHistory.getCalories()).isEqualTo(70);
    }
}
