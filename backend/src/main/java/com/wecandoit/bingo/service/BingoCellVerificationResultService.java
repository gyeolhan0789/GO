package com.wecandoit.bingo.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.cash.service.CashCommandService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.game.service.GameCompletionService;
import com.wecandoit.mission.domain.MissionType;
import lombok.RequiredArgsConstructor;
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
    private final CashCommandService cashCommandService;
    private final GameCompletionService gameCompletionService;

    public long applyResult(Long cellId, boolean approved, String rejectionReason, MissionType missionType) {
        BingoCell cell = bingoCellRepository.findByIdForUpdate(cellId)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_CELL_NOT_FOUND));

        BingoBoard board = bingoBoardRepository.findById(cell.getBoardId())
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        Game game = gameRepository.findByIdForUpdate(board.getGameId())
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_FOUND));
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            return 0L;
        }
        Room room = roomRepository.findByIdForUpdate(game.getRoomId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (room.getStatus() != GameRoomStatus.IN_PROGRESS) {
            return 0L;
        }
        if (cell.getVerificationStatus() != BingoCellVerificationStatus.PENDING) {
            return 0L;
        }

        if (!approved) {
            cell.reject(rejectionReason);
            bingoCellRepository.save(cell);
            return 0L;
        }

        cell.approve();
        bingoCellRepository.save(cell);
        long rewardCash = cashCommandService.grantBingoCellReward(
                cell.getMemberId(),
                room.getId(),
                cell.getId(),
                missionType
        );
        gameCompletionService.evaluateAndCompleteIfNeeded(game.getId(), board.getId());
        return rewardCash;
    }
}
