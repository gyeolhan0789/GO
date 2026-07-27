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
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
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
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;

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

    /**
     * 활성 보드의 셀 목록을 반환한다. 멤버십 검증 없이 내부 서비스(예: GameCompletionService)가
     * 게임 완료 판정을 위해 재사용하는 조회 전용 메서드다.
     */
    public List<BingoCell> getActiveBoardCells(Long roomId) {
        BingoBoard board = findActiveBoard(roomId);
        return bingoCellRepository.findAllByBoardId(board.getId());
    }

    private void validateMember(Long memberId, Long roomId) {
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
    }

    private BingoBoard findActiveBoard(Long roomId) {
        return bingoBoardRepository.findFirstByRoomIdAndStatusNotInOrderByIdDesc(roomId, INACTIVE_BOARD_STATUSES)
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private boolean isCompleted(Long boardId) {
        return !bingoCellRepository.existsByBoardIdAndCompletedAtIsNull(boardId);
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
