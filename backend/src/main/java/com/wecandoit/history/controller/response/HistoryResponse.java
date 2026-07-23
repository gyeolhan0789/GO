package com.wecandoit.history.controller.response;

import com.wecandoit.history.domain.HistoryPeriod;
import java.time.LocalDate;
import java.util.List;

public record HistoryResponse(
        HistoryPeriod period,
        LocalDate startDate,
        LocalDate endDate,
        int totalStep,
        int totalDistance,
        int totalCalories,
        List<HistoryDateResponse> histories
) {

    public static HistoryResponse from(
            HistoryPeriod period,
            LocalDate startDate,
            LocalDate endDate,
            List<HistoryDateResponse> histories
    ) {
        return new HistoryResponse(
                period,
                startDate,
                endDate,
                getTotalStep(histories),
                getTotalDistance(histories),
                getTotalCalories(histories),
                histories
        );
    }

    private static int getTotalStep(List<HistoryDateResponse> histories) {
        return histories.stream()
                .mapToInt(HistoryDateResponse::step)
                .sum();
    }

    private static int getTotalDistance(List<HistoryDateResponse> histories) {
        return histories.stream()
                .mapToInt(HistoryDateResponse::distance)
                .sum();
    }

    private static int getTotalCalories(List<HistoryDateResponse> histories) {
        return histories.stream()
                .mapToInt(HistoryDateResponse::calories)
                .sum();
    }
}
