package com.wecandoit.bingo.service;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
import com.wecandoit.bingo.controller.response.BingoBoardResponse.BattleParticipantProgressResponse;
import com.wecandoit.bingo.controller.response.BingoBoardResponse.BattleProgressResponse;
import com.wecandoit.bingo.controller.response.BingoCellResponse;
import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoLineCounter;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BingoReadService {

    private static final List<BingoBoardStatus> INACTIVE_BOARD_STATUSES =
            List.of(BingoBoardStatus.COMPLETED, BingoBoardStatus.EXPIRED);

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameRepository gameRepository;
    private final GameResultParticipantRepository gameResultParticipantRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;

    public BingoBoardResponse getActiveBoard(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getMode() == GameMode.BATTLE) {
            return getBattleBoard(memberId, room);
        }

        validateMember(memberId, roomId);
        Game game = findActiveGame(roomId);
        BingoBoard board = findActiveBoard(game.getId());
        List<BingoCell> cells = bingoCellRepository.findAllByBoardId(board.getId());
        List<BingoCellResponse> cellResponses = toCellResponses(cells);

        int approvedCellCount = countApprovedCells(cells);
        int completedBingoCount = BingoLineCounter.countCompletedLines(room.getBoardSize(), cells);
        boolean completed = !cells.isEmpty() && approvedCellCount == cells.size();
        boolean canRenew = completed && room.isHost(memberId);
        return BingoBoardResponse.of(
                board,
                roomId,
                cellResponses,
                room.getTargetBingoCount(),
                room.getTargetStepCount(),
                completedBingoCount,
                approvedCellCount,
                completed,
                canRenew
        );
    }

    private BingoBoardResponse getBattleBoard(Long memberId, Room room) {
        RoomMember myRoomMember = roomMemberRepository.findByRoomIdAndMemberId(room.getId(), memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN));
        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(room.getId());
        if (roomMembers.size() != 2) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        RoomMember opponentRoomMember = roomMembers.stream()
                .filter(roomMember -> !roomMember.getId().equals(myRoomMember.getId()))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));

        Game game = findBattleGame(room.getId());
        Map<Long, BingoBoard> boardsByRoomMemberId = bingoBoardRepository.findAllByGameIdOrderByIdAsc(game.getId())
                .stream()
                .filter(board -> board.getRoomMember() != null)
                .collect(Collectors.toMap(
                        board -> board.getRoomMember().getId(),
                        Function.identity()
                ));
        BingoBoard myBoard = getParticipantBoard(boardsByRoomMemberId, myRoomMember.getId());
        BingoBoard opponentBoard = getParticipantBoard(boardsByRoomMemberId, opponentRoomMember.getId());

        Map<Long, List<BingoCell>> cellsByBoardId = bingoCellRepository
                .findAllByBoardIdIn(List.of(myBoard.getId(), opponentBoard.getId()))
                .stream()
                .collect(Collectors.groupingBy(BingoCell::getBoardId));
        List<BingoCell> myCells = cellsByBoardId.getOrDefault(myBoard.getId(), List.of());
        List<BingoCell> opponentCells = cellsByBoardId.getOrDefault(opponentBoard.getId(), List.of());

        List<BingoCellResponse> myCellResponses = toCellResponses(myCells);
        BattleParticipantProgressResponse myProgress =
                toBattleParticipantProgress(myRoomMember, myBoard, room, myCells);
        BattleParticipantProgressResponse opponentProgress =
                toBattleParticipantProgress(opponentRoomMember, opponentBoard, room, opponentCells);
        Boolean result = gameResultParticipantRepository.findByGameIdAndMemberId(game.getId(), memberId)
                .map(participant -> participant.getResult())
                .orElse(null);

        return BingoBoardResponse.ofBattle(
                myBoard,
                room.getId(),
                myCellResponses,
                room.getTargetBingoCount(),
                room.getTargetStepCount(),
                myProgress.completedBingoCount(),
                myProgress.approvedCellCount(),
                myProgress.targetReached(),
                new BattleProgressResponse(
                        room.getStatus(),
                        game.getStatus(),
                        myProgress,
                        opponentProgress,
                        result
                )
        );
    }

    private void validateMember(Long memberId, Long roomId) {
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
    }

    private Game findActiveGame(Long roomId) {
        return gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.IN_PROGRESS)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS));
    }

    private Game findBattleGame(Long roomId) {
        return gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.IN_PROGRESS)
                .or(() -> gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.COMPLETED))
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS));
    }

    private BingoBoard findActiveBoard(Long gameId) {
        return bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(gameId, INACTIVE_BOARD_STATUSES)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private BingoBoard getParticipantBoard(Map<Long, BingoBoard> boardsByRoomMemberId, Long roomMemberId) {
        BingoBoard board = boardsByRoomMemberId.get(roomMemberId);
        if (board == null) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        return board;
    }

    private BattleParticipantProgressResponse toBattleParticipantProgress(
            RoomMember roomMember,
            BingoBoard board,
            Room room,
            List<BingoCell> cells
    ) {
        int approvedCellCount = countApprovedCells(cells);
        int completedBingoCount = BingoLineCounter.countCompletedLines(room.getBoardSize(), cells);
        boolean targetReached = room.getTargetBingoCount() != null
                && completedBingoCount >= room.getTargetBingoCount();
        return new BattleParticipantProgressResponse(
                roomMember.getMemberId(),
                board.getId(),
                cells.size(),
                approvedCellCount,
                completedBingoCount,
                targetReached
        );
    }

    private int countApprovedCells(List<BingoCell> cells) {
        return (int) cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .count();
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
