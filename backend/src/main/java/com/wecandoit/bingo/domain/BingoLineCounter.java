package com.wecandoit.bingo.domain;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Stateless calculation of completed bingo lines (rows, columns, diagonals) for a
 * {@code boardSize x boardSize} board.
 */
public final class BingoLineCounter {

    private BingoLineCounter() {
    }

    public static int countCompletedLines(int boardSize, List<BingoCell> cells) {
        Map<Long, BingoCell> cellsByPosition = new HashMap<>();
        for (BingoCell cell : cells) {
            cellsByPosition.put(positionKey(cell.getRow(), cell.getCol()), cell);
        }

        int completedLines = 0;

        for (int row = 0; row < boardSize; row++) {
            if (isRowCompleted(boardSize, row, cellsByPosition)) {
                completedLines++;
            }
        }

        for (int col = 0; col < boardSize; col++) {
            if (isColumnCompleted(boardSize, col, cellsByPosition)) {
                completedLines++;
            }
        }

        if (isMainDiagonalCompleted(boardSize, cellsByPosition)) {
            completedLines++;
        }

        if (isAntiDiagonalCompleted(boardSize, cellsByPosition)) {
            completedLines++;
        }

        return completedLines;
    }

    private static boolean isRowCompleted(int boardSize, int row, Map<Long, BingoCell> cellsByPosition) {
        for (int col = 0; col < boardSize; col++) {
            if (!isCompleted(row, col, cellsByPosition)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isColumnCompleted(int boardSize, int col, Map<Long, BingoCell> cellsByPosition) {
        for (int row = 0; row < boardSize; row++) {
            if (!isCompleted(row, col, cellsByPosition)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isMainDiagonalCompleted(int boardSize, Map<Long, BingoCell> cellsByPosition) {
        for (int i = 0; i < boardSize; i++) {
            if (!isCompleted(i, i, cellsByPosition)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isAntiDiagonalCompleted(int boardSize, Map<Long, BingoCell> cellsByPosition) {
        for (int i = 0; i < boardSize; i++) {
            if (!isCompleted(i, boardSize - 1 - i, cellsByPosition)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isCompleted(int row, int col, Map<Long, BingoCell> cellsByPosition) {
        BingoCell cell = cellsByPosition.get(positionKey(row, col));
        return cell != null && cell.getCompletedAt() != null;
    }

    private static long positionKey(int row, int col) {
        return (long) row * 10_000L + col;
    }
}
