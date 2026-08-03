package com.wecandoit.bingo.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.domain.BingoLineCounter;
import com.wecandoit.bingo.event.BattleBingoProgressUpdatedEvent;
import com.wecandoit.bingo.event.CooperativeBingoProgressUpdatedEvent;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.point.service.PointCommandService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomStatus;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCompletionService;
import com.wecandoit.mission.domain.MissionDifficulty;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class BingoCellVerificationResultService {

    private final BingoCellRepository bingoCellRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final GameRepository gameRepository;
    private final RoomRepository roomRepository;
    private final PointCommandService pointCommandService;
    private final GameCompletionService gameCompletionService;
    private final ApplicationEventPublisher eventPublisher;

    public long applyResult(Long cellId, boolean approved, String rejectionReason, MissionDifficulty missionDifficulty) {
        BingoCell cell = bingoCellRepository.findByIdForUpdate(cellId)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_CELL_NOT_FOUND));

        BingoBoard board = bingoBoardRepository.findById(cell.getBoardId())
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        Game game = gameRepository.findByIdForUpdate(board.getGameId())
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_FOUND));
        if (game.getStatus() != GameStatus.ACTIVE) {
            return 0L;
        }
        Room room = roomRepository.findByIdForUpdate(game.getRoomId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (room.getStatus() != RoomStatus.ACTIVE) {
            return 0L;
        }
        if (cell.getVerificationStatus() != BingoCellVerificationStatus.PENDING) {
            return 0L;
        }

        if (!approved) {
            cell.reject(rejectionReason);
            bingoCellRepository.save(cell);
            publishProgressEvent(room, board, cell);
            return 0L;
        }

        cell.approve();
        bingoCellRepository.save(cell);
        long rewardPoint = pointCommandService.grantBingoCellReward(
                cell.getMemberId(),
                room.getId(),
                cell.getId(),
                missionDifficulty
        );
        gameCompletionService.evaluateAndCompleteIfNeeded(game.getId(), board.getId());
        publishProgressEvent(room, board, cell);
        return rewardPoint;
    }

    private void publishProgressEvent(Room room, BingoBoard board, BingoCell changedCell) {
        if (room.getMode() != GameMode.COOPERATE && room.getMode() != GameMode.BATTLE) {
            return;
        }

        List<BingoCell> cells = bingoCellRepository.findAllByBoardId(board.getId());
        int approvedCellCount = (int) cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .count();
        int completedBingoCount = BingoLineCounter.countCompletedLines(board.getBoardSize(), cells);

        if (room.getMode() == GameMode.COOPERATE) {
            eventPublisher.publishEvent(new CooperativeBingoProgressUpdatedEvent(
                    room.getId(),
                    board.getId(),
                    changedCell.getId(),
                    changedCell.getVerificationStatus(),
                    changedCell.getMemberId(),
                    changedCell.getRejectionReason(),
                    approvedCellCount,
                    completedBingoCount
            ));
            return;
        }

        eventPublisher.publishEvent(new BattleBingoProgressUpdatedEvent(
                room.getId(),
                board.getGameId(),
                changedCell.getMemberId(),
                board.getId(),
                approvedCellCount,
                completedBingoCount,
                completedBingoCount >= board.getTargetBingoCount()
        ));
    }
}
