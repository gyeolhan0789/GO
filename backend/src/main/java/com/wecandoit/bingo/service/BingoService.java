package com.wecandoit.bingo.service;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class BingoService {

    private final RoomRepository roomRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;

    public BingoBoardResponse generateBoard(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateHost(memberId, room);
        validateRoomInProgress(room);
        validateBoardNotExists(roomId);

        int boardSize = room.getBoardSize();
        int cellCount = boardSize * boardSize;
        List<Mission> missions = missionRepository.findRandomMissions(cellCount);
        if (missions.size() < cellCount) {
            throw new CustomException(ErrorCode.MISSION_POOL_INSUFFICIENT);
        }

        BingoBoard board = bingoBoardRepository.save(BingoBoard.create(roomId, boardSize));
        List<BingoCellResponse> cellResponses = createCells(board, boardSize, missions);
        return BingoBoardResponse.of(board, cellResponses);
    }

    private void validateHost(Long memberId, Room room) {
        if (!room.getHostId().equals(memberId)) {
            throw new CustomException(ErrorCode.BINGO_BOARD_GENERATE_FORBIDDEN);
        }
    }

    private void validateRoomInProgress(Room room) {
        if (room.getStatus() != GameRoomStatus.IN_PROGRESS) {
            throw new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS);
        }
    }

    private void validateBoardNotExists(Long roomId) {
        if (bingoBoardRepository.existsByRoomId(roomId)) {
            throw new CustomException(ErrorCode.BINGO_BOARD_ALREADY_EXISTS);
        }
    }

    private List<BingoCellResponse> createCells(BingoBoard board, int boardSize, List<Mission> missions) {
        List<BingoCellResponse> cellResponses = new ArrayList<>();
        int index = 0;
        for (int row = 0; row < boardSize; row++) {
            for (int col = 0; col < boardSize; col++) {
                Mission mission = missions.get(index++);
                BingoCell cell = bingoCellRepository.save(BingoCell.create(board.getId(), mission.getId(), row, col));
                cellResponses.add(BingoCellResponse.of(cell, mission));
            }
        }
        return cellResponses;
    }
}
