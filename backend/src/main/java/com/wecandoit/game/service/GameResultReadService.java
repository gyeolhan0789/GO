package com.wecandoit.game.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.game.controller.response.GameResultParticipantResponse;
import com.wecandoit.game.controller.response.GameResultResponse;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
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
    private final GameResultParticipantRepository gameResultParticipantRepository;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MemberRepository memberRepository;

    public GameResultResponse getGameResult(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
        GameResult gameResult = gameResultRepository.findFirstByRoomIdOrderByCreatedAtDescIdDesc(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_COMPLETED));
        return GameResultResponse.of(gameResult, room, getParticipantResponses(gameResult.getGameId()));
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
        Map<Long, Room> roomsById = roomRepository.findAllById(gameResults.getContent().stream()
                        .map(GameResult::getRoomId)
                        .toList())
                .stream()
                .collect(Collectors.toMap(Room::getId, Function.identity()));

        List<GameResultParticipant> participants = gameResultParticipantRepository.findAllByGameIdInOrderByIdAsc(
                gameResults.getContent().stream().map(GameResult::getGameId).toList()
        );
        Map<Long, List<GameResultParticipant>> participantsByGameId = participants.stream()
                .collect(Collectors.groupingBy(GameResultParticipant::getGameId));
        Map<Long, Member> membersById = memberRepository.findAllById(participants.stream()
                        .map(GameResultParticipant::getMemberId)
                        .distinct()
                        .toList())
                .stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));

        return SliceResponse.from(gameResults.map(gameResult -> GameResultResponse.of(
                gameResult,
                roomsById.get(gameResult.getRoomId()),
                toParticipantResponses(
                        participantsByGameId.getOrDefault(gameResult.getGameId(), List.of()),
                        membersById
                )
        )));
    }

    private List<GameResultParticipantResponse> getParticipantResponses(Long gameId) {
        List<GameResultParticipant> participants =
                gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(gameId);
        Map<Long, Member> membersById = memberRepository.findAllById(participants.stream()
                        .map(GameResultParticipant::getMemberId)
                        .toList())
                .stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        return toParticipantResponses(participants, membersById);
    }

    private List<GameResultParticipantResponse> toParticipantResponses(
            List<GameResultParticipant> participants,
            Map<Long, Member> membersById
    ) {
        return participants.stream()
                .map(participant -> GameResultParticipantResponse.of(
                        participant,
                        getMember(membersById, participant.getMemberId())
                ))
                .toList();
    }

    private Member getMember(Map<Long, Member> membersById, Long memberId) {
        Member member = membersById.get(memberId);
        if (member == null) {
            throw new CustomException(ErrorCode.MEMBER_NOT_FOUND);
        }
        return member;
    }
}
