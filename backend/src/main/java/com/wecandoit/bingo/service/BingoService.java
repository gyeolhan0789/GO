package com.wecandoit.bingo.service;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class BingoService {

    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.CLOSED);

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;

    public BingoBoardResponse generateBoard(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateHost(memberId, room);
        validateRoomInProgress(room);
        validateBoardNotExists(roomId);

        return generateNewBoard(room);
    }

    public BingoBoardResponse getActiveBoard(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateMember(memberId, roomId);

        BingoBoard board = findActiveBoard(roomId);
        List<BingoCell> cells = bingoCellRepository.findAllByBoardId(board.getId());
        List<BingoCellResponse> cellResponses = toCellResponses(cells);

        boolean completed = isCompleted(board.getId());
        boolean canRenew = completed && room.isHost(memberId);
        return BingoBoardResponse.of(board, cellResponses, completed, canRenew);
    }

    public BingoBoardResponse renewBoard(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateRoomInProgress(room);

        BingoBoard activeBoard = findActiveBoard(roomId);
        validateRenewalHost(memberId, room);
        validateBoardCompleted(activeBoard.getId());

        BingoBoardResponse newBoardResponse = generateNewBoard(room);
        activeBoard.complete();
        bingoBoardRepository.save(activeBoard);
        return newBoardResponse;
    }

    private BingoBoardResponse generateNewBoard(Room room) {
        int boardSize = room.getBoardSize();
        int cellCount = boardSize * boardSize;
        List<Mission> missions = missionRepository.findRandomMissions(cellCount);
        if (missions.size() < cellCount) {
            throw new CustomException(ErrorCode.MISSION_POOL_INSUFFICIENT);
        }

        BingoBoard board = bingoBoardRepository.save(BingoBoard.create(room.getId(), boardSize));
        List<BingoCellResponse> cellResponses = createCells(board, boardSize, missions);
        return BingoBoardResponse.of(board, cellResponses);
    }

    private void validateHost(Long memberId, Room room) {
        if (!room.getHostId().equals(memberId)) {
            throw new CustomException(ErrorCode.BINGO_BOARD_GENERATE_FORBIDDEN);
        }
    }

    private void validateRenewalHost(Long memberId, Room room) {
        if (!room.isHost(memberId)) {
            throw new CustomException(ErrorCode.BINGO_BOARD_RENEWAL_FORBIDDEN);
        }
    }

    private void validateMember(Long memberId, Long roomId) {
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
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

    private void validateBoardCompleted(Long boardId) {
        if (!isCompleted(boardId)) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_COMPLETED);
        }
    }

    private BingoBoard findActiveBoard(Long roomId) {
        return bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(roomId, INACTIVE_BOARD_STATUSES)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private boolean isCompleted(Long boardId) {
        return !bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(boardId);
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

    private List<BingoCellResponse> toCellResponses(List<BingoCell> cells) {
        List<Long> missionIds = cells.stream().map(BingoCell::getMissionId).distinct().toList();
        Map<Long, Mission> missionsById = missionRepository.findAllById(missionIds).stream()
                .collect(Collectors.toMap(Mission::getId, Function.identity()));
        return cells.stream()
                .map(cell -> BingoCellResponse.of(cell, missionsById.get(cell.getMissionId())))
                .toList();
    }
}
