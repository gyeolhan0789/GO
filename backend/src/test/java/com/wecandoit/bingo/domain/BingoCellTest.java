package com.wecandoit.bingo.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("빙고 셀")
class BingoCellTest {

    @Test
    @DisplayName("reject: rejectionReason이 255자를 초과하면 잘라서 저장한다")
    void reject_longReason_truncatedTo255() {
        BingoCell cell = BingoCell.create(1L, 1L, 0, 0);
        String longReason = "a".repeat(300);

        cell.reject(longReason);

        assertThat(cell.getRejectionReason()).hasSize(255);
        assertThat(cell.getRejectionReason()).isEqualTo("a".repeat(255));
    }

    @Test
    @DisplayName("reject: rejectionReason이 255자 이하면 그대로 저장한다")
    void reject_shortReason_keptAsIs() {
        BingoCell cell = BingoCell.create(1L, 1L, 0, 0);

        cell.reject("사진으로 미션 완료를 확인할 수 없어요.");

        assertThat(cell.getRejectionReason()).isEqualTo("사진으로 미션 완료를 확인할 수 없어요.");
    }
}
