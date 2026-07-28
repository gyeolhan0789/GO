package com.wecandoit.bingo.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoCellVerificationStatus;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.service.GameCompletionService;
import com.wecandoit.game.domain.GameRoomStatus;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.RoomRepository;
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
    private final GameCompletionService gameCompletionService;

    public void applyResult(Long cellId, boolean approved, String rejectionReason) {
        BingoCell cell = bingoCellRepository.findByIdForUpdate(cellId)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_CELL_NOT_FOUND));

        BingoBoard board = bingoBoardRepository.findById(cell.getBoardId())
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        Game game = gameRepository.findByIdForUpdate(board.getGameId())
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_FOUND));
        if (game.getStatus() != GameStatus.IN_PROGRESS) {
            return;
        }
        Room room = roomRepository.findByIdForUpdate(game.getRoomId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (room.getStatus() != GameRoomStatus.IN_PROGRESS) {
            return;
        }
        if (cell.getVerificationStatus() != BingoCellVerificationStatus.PENDING) {
            return;
        }

        if (!approved) {
            cell.reject(rejectionReason);
            bingoCellRepository.save(cell);
            return;
        }

        cell.approve();
        bingoCellRepository.save(cell);
        gameCompletionService.evaluateAndCompleteIfNeeded(game.getId());
    }
}
