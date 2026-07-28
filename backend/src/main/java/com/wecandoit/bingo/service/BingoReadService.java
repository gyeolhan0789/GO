package com.wecandoit.bingo.service;

import com.wecandoit.bingo.controller.response.BingoBoardResponse;
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
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;

    public BingoBoardResponse getActiveBoard(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        validateMember(memberId, roomId);

        Game game = findActiveGame(roomId);
        BingoBoard board = findActiveBoard(room, game.getId(), memberId);
        List<BingoCell> cells = bingoCellRepository.findAllByBoardId(board.getId());
        List<BingoCellResponse> cellResponses = toCellResponses(cells);

        int approvedCellCount = (int) cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .count();
        int completedBingoCount = BingoLineCounter.countCompletedLines(room.getBoardSize(), cells);
        boolean completed = !cells.isEmpty() && approvedCellCount == cells.size();
        boolean canRenew = completed && room.getMode() != GameMode.BATTLE && room.isHost(memberId);
        return BingoBoardResponse.of(
                board,
                roomId,
                cellResponses,
                room.getTargetBingoCount(),
                completedBingoCount,
                approvedCellCount,
                completed,
                canRenew
        );
    }

    /**
     * 활성 보드의 셀 목록을 반환한다. 멤버십 검증 없이 내부 서비스(예: GameCompletionService)가
     * 게임 완료 판정을 위해 재사용하는 조회 전용 메서드다.
     */
    public List<BingoCell> getActiveBoardCells(Long gameId) {
        BingoBoard board = findActiveBoard(gameId);
        return bingoCellRepository.findAllByBoardId(board.getId());
    }

    public List<BingoCell> getBoardCells(Long boardId) {
        return bingoCellRepository.findAllByBoardId(boardId);
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

    private BingoBoard findActiveBoard(Long gameId) {
        return bingoBoardRepository.findFirstByGameIdAndStatusNotInOrderByIdDesc(gameId, INACTIVE_BOARD_STATUSES)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private BingoBoard findActiveBoard(Room room, Long gameId, Long memberId) {
        if (room.getMode() == GameMode.BATTLE) {
            RoomMember roomMember = roomMemberRepository.findByRoomIdAndMemberId(room.getId(), memberId)
                    .orElseThrow(() -> new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN));
            return bingoBoardRepository.findFirstByGameIdAndRoomMemberIdAndStatusNotInOrderByIdDesc(
                            gameId,
                            roomMember.getId(),
                            INACTIVE_BOARD_STATUSES
                    )
                    .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
        }
        return findActiveBoard(gameId);
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
