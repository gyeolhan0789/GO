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
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCycleCommandService;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.time.LocalDateTime;
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
    private final GameParticipantRepository gameParticipantRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;

    public BingoBoardResponse getActiveBoard(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateActiveRoomMember(room, memberId);
        Game game = findActiveGame(roomId);

        if (room.getMode() == GameMode.BATTLE) {
            return getBattleBoard(memberId, room, game);
        }

        BingoBoard board = findActiveBoard(game.getId());
        List<BingoCell> cells = bingoCellRepository.findAllByBoardId(board.getId());
        List<BingoCellResponse> cellResponses = toCellResponses(cells);
        int approvedCellCount = countApprovedCells(cells);
        int completedBingoCount = BingoLineCounter.countCompletedLines(board.getBoardSize(), cells);
        boolean completed = completedBingoCount >= board.getTargetBingoCount();
        boolean renewalRequired = GameCycleCommandService.isRenewalPeriodPassed(game, LocalDateTime.now());
        boolean canRenew = (completed || renewalRequired) && room.isHost(memberId);

        return BingoBoardResponse.of(
                board,
                roomId,
                cellResponses,
                completedBingoCount,
                approvedCellCount,
                completed,
                canRenew,
                renewalRequired
        );
    }

    private BingoBoardResponse getBattleBoard(Long memberId, Room room, Game game) {
        List<RoomMember> roomMembers = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(room.getId());
        if (roomMembers.size() != GameMode.BATTLE.getMaximumParticipants()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        GameParticipant myParticipant = gameParticipantRepository.findByGameIdAndMemberId(game.getId(), memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_PARTICIPANT_NOT_FOUND));
        GameParticipant opponentParticipant =
                gameParticipantRepository.findAllByGameIdOrderByJoinedAtAsc(game.getId()).stream()
                        .filter(participant -> !participant.getMemberId().equals(memberId))
                        .findFirst()
                        .orElseThrow(() -> new CustomException(ErrorCode.GAME_PARTICIPANT_NOT_FOUND));

        Map<Long, BingoBoard> boardsByParticipantId =
                bingoBoardRepository.findAllByGameIdOrderByIdAsc(game.getId()).stream()
                        .filter(BingoBoard::isPersonal)
                        .collect(Collectors.toMap(
                                BingoBoard::getGameParticipantId,
                                Function.identity()
                        ));
        BingoBoard myBoard = getParticipantBoard(boardsByParticipantId, myParticipant.getId());
        BingoBoard opponentBoard = getParticipantBoard(boardsByParticipantId, opponentParticipant.getId());
        Map<Long, List<BingoCell>> cellsByBoardId = bingoCellRepository
                .findAllByBoardIdIn(List.of(myBoard.getId(), opponentBoard.getId()))
                .stream()
                .collect(Collectors.groupingBy(BingoCell::getBoardId));
        List<BingoCell> myCells = cellsByBoardId.getOrDefault(myBoard.getId(), List.of());
        List<BingoCell> opponentCells = cellsByBoardId.getOrDefault(opponentBoard.getId(), List.of());

        BattleParticipantProgressResponse myProgress =
                toBattleParticipantProgress(myParticipant, myBoard, myCells);
        BattleParticipantProgressResponse opponentProgress =
                toBattleParticipantProgress(opponentParticipant, opponentBoard, opponentCells);

        return BingoBoardResponse.ofBattle(
                myBoard,
                room.getId(),
                toCellResponses(myCells),
                myProgress.completedBingoCount(),
                myProgress.approvedCellCount(),
                myProgress.targetReached(),
                new BattleProgressResponse(
                        room.getStatus(),
                        game.getStatus(),
                        myProgress,
                        opponentProgress,
                        null
                )
        );
    }

    private void validateActiveRoomMember(Room room, Long memberId) {
        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new CustomException(ErrorCode.ROOM_CLOSED);
        }
        if (!roomMemberRepository.existsByRoomIdAndMemberId(room.getId(), memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
    }

    private Game findActiveGame(Long roomId) {
        return gameRepository.findFirstByRoomIdAndStatusOrderByIdDesc(roomId, GameStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_IN_PROGRESS));
    }

    private BingoBoard findActiveBoard(Long gameId) {
        return bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(
                        gameId,
                        INACTIVE_BOARD_STATUSES
                )
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private BingoBoard getParticipantBoard(Map<Long, BingoBoard> boardsByParticipantId, Long participantId) {
        BingoBoard board = boardsByParticipantId.get(participantId);
        if (board == null) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        return board;
    }

    private BattleParticipantProgressResponse toBattleParticipantProgress(
            GameParticipant participant,
            BingoBoard board,
            List<BingoCell> cells
    ) {
        int approvedCellCount = countApprovedCells(cells);
        int completedBingoCount = BingoLineCounter.countCompletedLines(board.getBoardSize(), cells);
        return new BattleParticipantProgressResponse(
                participant.getMemberId(),
                board.getId(),
                cells.size(),
                approvedCellCount,
                completedBingoCount,
                completedBingoCount >= board.getTargetBingoCount()
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
