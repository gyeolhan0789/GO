package com.wecandoit.game.result.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.game.result.controller.response.GameResultResponse;
import com.wecandoit.game.result.domain.GameResult;
import com.wecandoit.game.result.repository.GameResultRepository;
import com.wecandoit.game.room.domain.Room;
import com.wecandoit.game.room.domain.RoomMember;
import com.wecandoit.game.room.repository.RoomMemberRepository;
import com.wecandoit.game.room.repository.RoomRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GameResultReadService {

    private final GameResultRepository gameResultRepository;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;

    public GameResultResponse getGameResult(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
        if (!room.isCompleted()) {
            throw new CustomException(ErrorCode.GAME_NOT_COMPLETED);
        }

        GameResult gameResult = gameResultRepository.findByRoomId(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_COMPLETED));
        return GameResultResponse.from(gameResult);
    }

    public SliceResponse<GameResultResponse> getMyGameResults(Long memberId, Pageable pageable) {
        List<Long> roomIds = roomMemberRepository.findAllByMemberIdOrderByJoinedAtDesc(memberId).stream()
                .map(RoomMember::getRoomId)
                .distinct()
                .toList();
        if (roomIds.isEmpty()) {
            return SliceResponse.from(new SliceImpl<>(List.of(), pageable, false));
        }

        Slice<GameResult> gameResults = gameResultRepository.findByRoomIdInOrderByCreatedAtDesc(roomIds, pageable);
        return SliceResponse.from(gameResults.map(GameResultResponse::from));
    }
}
