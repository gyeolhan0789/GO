package com.wecandoit.game.result.service;

import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoLineCounter;
import com.wecandoit.bingo.service.BingoService;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.game.result.domain.GameResult;
import com.wecandoit.game.result.repository.GameResultRepository;
import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class GameCompletionService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final GameResultRepository gameResultRepository;
    private final BingoService bingoService;

    public void evaluateAndCompleteIfNeeded(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getStatus() == GameRoomStatus.COMPLETED) {
            return;
        }

        List<BingoCell> cells = bingoService.getActiveBoardCells(roomId);
        int lineCount = BingoLineCounter.countCompletedLines(room.getBoardSize(), cells);
        if (lineCount < room.getTargetBingoCount()) {
            return;
        }

        room.complete();

        int completedMissionCount = (int) cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .count();

        Map<Long, Long> completedCountByMember = cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .collect(Collectors.groupingBy(BingoCell::getMemberId, Collectors.counting()));

        List<RoomMember> members = roomMemberRepository.findAllByRoomIdOrderByJoinedAtAsc(roomId);
        for (RoomMember member : members) {
            long count = completedCountByMember.getOrDefault(member.getMemberId(), 0L);
            member.updateCompletedMissionCount((int) count);
        }

        gameResultRepository.save(GameResult.create(roomId, true, lineCount, completedMissionCount, 0L));
    }
}
