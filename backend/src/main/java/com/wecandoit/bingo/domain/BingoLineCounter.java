package com.wecandoit.bingo.domain;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/**
 * Stateless calculation of completed bingo lines (rows, columns, diagonals) for a
 * {@code boardSize x boardSize} board.
 */
public final class BingoLineCounter {

    private BingoLineCounter() {
    }

    public static int countCompletedLines(int boardSize, List<BingoCell> cells) {
        return countCompletedLines(boardSize, cells, cell -> cell.getCompletedAt() != null);
    }

    public static int countCompletedLines(
            int boardSize,
            List<BingoCell> cells,
            Predicate<BingoCell> completedPredicate
    ) {
        Map<Long, BingoCell> cellsByPosition = new HashMap<>();
        for (BingoCell cell : cells) {
            cellsByPosition.put(positionKey(cell.getRow(), cell.getCol()), cell);
        }

        int completedLines = 0;

        for (int row = 0; row < boardSize; row++) {
            if (isRowCompleted(boardSize, row, cellsByPosition, completedPredicate)) {
                completedLines++;
            }
        }

        for (int col = 0; col < boardSize; col++) {
            if (isColumnCompleted(boardSize, col, cellsByPosition, completedPredicate)) {
                completedLines++;
            }
        }

        if (isMainDiagonalCompleted(boardSize, cellsByPosition, completedPredicate)) {
            completedLines++;
        }

        if (isAntiDiagonalCompleted(boardSize, cellsByPosition, completedPredicate)) {
            completedLines++;
        }

        return completedLines;
    }

    private static boolean isRowCompleted(
            int boardSize,
            int row,
            Map<Long, BingoCell> cellsByPosition,
            Predicate<BingoCell> completedPredicate
    ) {
        for (int col = 0; col < boardSize; col++) {
            if (!isCompleted(row, col, cellsByPosition, completedPredicate)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isColumnCompleted(
            int boardSize,
            int col,
            Map<Long, BingoCell> cellsByPosition,
            Predicate<BingoCell> completedPredicate
    ) {
        for (int row = 0; row < boardSize; row++) {
            if (!isCompleted(row, col, cellsByPosition, completedPredicate)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isMainDiagonalCompleted(
            int boardSize,
            Map<Long, BingoCell> cellsByPosition,
            Predicate<BingoCell> completedPredicate
    ) {
        for (int i = 0; i < boardSize; i++) {
            if (!isCompleted(i, i, cellsByPosition, completedPredicate)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isAntiDiagonalCompleted(
            int boardSize,
            Map<Long, BingoCell> cellsByPosition,
            Predicate<BingoCell> completedPredicate
    ) {
        for (int i = 0; i < boardSize; i++) {
            if (!isCompleted(i, boardSize - 1 - i, cellsByPosition, completedPredicate)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isCompleted(
            int row,
            int col,
            Map<Long, BingoCell> cellsByPosition,
            Predicate<BingoCell> completedPredicate
    ) {
        BingoCell cell = cellsByPosition.get(positionKey(row, col));
        return cell != null && completedPredicate.test(cell);
    }

    private static long positionKey(int row, int col) {
        return (long) row * 10_000L + col;
    }
}
