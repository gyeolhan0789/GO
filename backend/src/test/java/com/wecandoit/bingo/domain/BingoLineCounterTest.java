package com.wecandoit.bingo.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("빙고 라인 계산")
class BingoLineCounterTest {

    @Test
    @DisplayName("boardSize 3: 완료된 셀이 없으면 0줄이다")
    void boardSize3_noCompletedCells_zeroLines() {
        List<BingoCell> cells = createBoard(3);

        int result = BingoLineCounter.countCompletedLines(3, cells);

        assertThat(result).isZero();
    }

    @Test
    @DisplayName("boardSize 3: 일부만 완료되어 있으면 0줄이다")
    void boardSize3_scatteredCompletedCells_zeroLines() {
        List<BingoCell> cells = createBoard(3);
        complete(cells, 0, 0);
        complete(cells, 1, 2);

        int result = BingoLineCounter.countCompletedLines(3, cells);

        assertThat(result).isZero();
    }

    @Test
    @DisplayName("boardSize 3: 가로 한 줄이 완료되면 1줄이다")
    void boardSize3_oneHorizontalLine() {
        List<BingoCell> cells = createBoard(3);
        complete(cells, 1, 0);
        complete(cells, 1, 1);
        complete(cells, 1, 2);

        int result = BingoLineCounter.countCompletedLines(3, cells);

        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("boardSize 3: 세로 한 줄이 완료되면 1줄이다")
    void boardSize3_oneVerticalLine() {
        List<BingoCell> cells = createBoard(3);
        complete(cells, 0, 1);
        complete(cells, 1, 1);
        complete(cells, 2, 1);

        int result = BingoLineCounter.countCompletedLines(3, cells);

        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("boardSize 3: 좌상단-우하단 대각선이 완료되면 1줄이다")
    void boardSize3_mainDiagonal() {
        List<BingoCell> cells = createBoard(3);
        complete(cells, 0, 0);
        complete(cells, 1, 1);
        complete(cells, 2, 2);

        int result = BingoLineCounter.countCompletedLines(3, cells);

        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("boardSize 3: 우상단-좌하단 대각선이 완료되면 1줄이다")
    void boardSize3_antiDiagonal() {
        List<BingoCell> cells = createBoard(3);
        complete(cells, 0, 2);
        complete(cells, 1, 1);
        complete(cells, 2, 0);

        int result = BingoLineCounter.countCompletedLines(3, cells);

        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("boardSize 3: 보드 전체가 완료되면 행+열+대각선 수만큼 카운트된다")
    void boardSize3_fullyCompletedBoard() {
        List<BingoCell> cells = createBoard(3);
        completeAll(cells);

        int result = BingoLineCounter.countCompletedLines(3, cells);

        assertThat(result).isEqualTo(3 + 3 + 2);
    }

    @Test
    @DisplayName("boardSize 4: 완료된 셀이 없으면 0줄이다")
    void boardSize4_noCompletedCells_zeroLines() {
        List<BingoCell> cells = createBoard(4);

        int result = BingoLineCounter.countCompletedLines(4, cells);

        assertThat(result).isZero();
    }

    @Test
    @DisplayName("boardSize 4: 가로 한 줄이 완료되면 1줄이다")
    void boardSize4_oneHorizontalLine() {
        List<BingoCell> cells = createBoard(4);
        complete(cells, 2, 0);
        complete(cells, 2, 1);
        complete(cells, 2, 2);
        complete(cells, 2, 3);

        int result = BingoLineCounter.countCompletedLines(4, cells);

        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("boardSize 4: 세로 한 줄이 완료되면 1줄이다")
    void boardSize4_oneVerticalLine() {
        List<BingoCell> cells = createBoard(4);
        complete(cells, 0, 3);
        complete(cells, 1, 3);
        complete(cells, 2, 3);
        complete(cells, 3, 3);

        int result = BingoLineCounter.countCompletedLines(4, cells);

        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("boardSize 4: 좌상단-우하단 대각선이 완료되면 1줄이다")
    void boardSize4_mainDiagonal() {
        List<BingoCell> cells = createBoard(4);
        complete(cells, 0, 0);
        complete(cells, 1, 1);
        complete(cells, 2, 2);
        complete(cells, 3, 3);

        int result = BingoLineCounter.countCompletedLines(4, cells);

        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("boardSize 4: 우상단-좌하단 대각선이 완료되면 1줄이다")
    void boardSize4_antiDiagonal() {
        List<BingoCell> cells = createBoard(4);
        complete(cells, 0, 3);
        complete(cells, 1, 2);
        complete(cells, 2, 1);
        complete(cells, 3, 0);

        int result = BingoLineCounter.countCompletedLines(4, cells);

        assertThat(result).isEqualTo(1);
    }

    @Test
    @DisplayName("boardSize 4: 여러 줄이 동시에 완료되면 각각 카운트된다")
    void boardSize4_multipleLinesAtOnce() {
        List<BingoCell> cells = createBoard(4);
        // row 0 완료
        complete(cells, 0, 0);
        complete(cells, 0, 1);
        complete(cells, 0, 2);
        complete(cells, 0, 3);
        // col 1 완료 (0,1)은 위에서 이미 완료됨
        complete(cells, 1, 1);
        complete(cells, 2, 1);
        complete(cells, 3, 1);

        int result = BingoLineCounter.countCompletedLines(4, cells);

        assertThat(result).isEqualTo(2);
    }

    @Test
    @DisplayName("boardSize 4: 보드 전체가 완료되면 행+열+대각선 수만큼 카운트된다")
    void boardSize4_fullyCompletedBoard() {
        List<BingoCell> cells = createBoard(4);
        completeAll(cells);

        int result = BingoLineCounter.countCompletedLines(4, cells);

        assertThat(result).isEqualTo(4 + 4 + 2);
    }

    private List<BingoCell> createBoard(int boardSize) {
        List<BingoCell> cells = new ArrayList<>();
        long missionId = 1L;
        for (int row = 0; row < boardSize; row++) {
            for (int col = 0; col < boardSize; col++) {
                cells.add(BingoCell.create(1L, missionId++, row, col));
            }
        }
        return cells;
    }

    private void complete(List<BingoCell> cells, int row, int col) {
        for (BingoCell cell : cells) {
            if (cell.getRow() == row && cell.getCol() == col) {
                ReflectionTestUtils.setField(cell, "completedAt", LocalDateTime.now());
                return;
            }
        }
    }

    private void completeAll(List<BingoCell> cells) {
        for (BingoCell cell : cells) {
            ReflectionTestUtils.setField(cell, "completedAt", LocalDateTime.now());
        }
    }
}
