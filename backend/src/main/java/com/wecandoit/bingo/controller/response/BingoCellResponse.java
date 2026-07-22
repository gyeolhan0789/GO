package com.wecandoit.bingo.controller.response;

import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.mission.controller.response.MissionResponse;
import com.wecandoit.mission.domain.Mission;

public record BingoCellResponse(
        int row,
        int col,
        MissionResponse mission
) {

    public static BingoCellResponse of(BingoCell cell, Mission mission) {
        return new BingoCellResponse(cell.getRow(), cell.getCol(), MissionResponse.from(mission));
    }
}
