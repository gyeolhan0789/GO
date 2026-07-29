package com.wecandoit.game.service;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoCell;
import com.wecandoit.bingo.domain.BingoLineCounter;
import com.wecandoit.bingo.repository.BingoBoardRepository;
import com.wecandoit.bingo.repository.BingoCellRepository;
import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.common.response.SliceResponse;
import com.wecandoit.game.controller.response.GameResultBingoBoardResponse;
import com.wecandoit.game.controller.response.GameResultBingoCellResponse;
import com.wecandoit.game.controller.response.GameResultBoardOwnerResponse;
import com.wecandoit.game.controller.response.GameResultDetailResponse;
import com.wecandoit.game.controller.response.GameResultParticipantResponse;
import com.wecandoit.game.controller.response.GameResultResponse;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
import com.wecandoit.game.repository.RoomMemberRepository;
import com.wecandoit.game.repository.RoomRepository;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
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
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;

    public GameResultDetailResponse getGameResult(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        if (!roomMemberRepository.existsByRoomIdAndMemberId(roomId, memberId)) {
            throw new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN);
        }
        GameResult gameResult = gameResultRepository.findFirstByRoomIdOrderByCreatedAtDescIdDesc(roomId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_COMPLETED));
        List<GameResultParticipant> participants =
                gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(gameResult.getGameId());
        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(gameResult.getGameId());
        if (boards.isEmpty()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        Map<Long, Member> membersById = getMembersById(participants, room, boards);
        List<GameResultParticipantResponse> participantResponses =
                toParticipantResponses(participants, membersById);
        List<GameResultBingoBoardResponse> bingoBoardResponses =
                toBingoBoardResponses(room, boards, participants, membersById);

        return GameResultDetailResponse.of(gameResult, room, participantResponses, bingoBoardResponses);
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

    private Map<Long, Member> getMembersById(
            List<GameResultParticipant> participants,
            Room room,
            List<BingoBoard> boards
    ) {
        List<Long> participantMemberIds = participants.stream()
                .map(GameResultParticipant::getMemberId)
                .toList();
        List<Long> boardOwnerMemberIds = getBoardOwnerMemberIds(room, boards);
        List<Long> memberIds = Stream.concat(participantMemberIds.stream(), boardOwnerMemberIds.stream())
                .distinct()
                .toList();
        return memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
    }

    private List<Long> getBoardOwnerMemberIds(Room room, List<BingoBoard> boards) {
        if (room.getMode() != GameMode.BATTLE) {
            return List.of();
        }
        return boards.stream()
                .map(board -> {
                    if (board.getRoomMember() == null) {
                        throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
                    }
                    return board.getRoomMember().getMemberId();
                })
                .toList();
    }

    private List<GameResultBingoBoardResponse> toBingoBoardResponses(
            Room room,
            List<BingoBoard> boards,
            List<GameResultParticipant> participants,
            Map<Long, Member> membersById
    ) {
        List<Long> boardIds = boards.stream().map(BingoBoard::getId).toList();
        Map<Long, List<BingoCell>> cellsByBoardId = bingoCellRepository.findAllByBoardIdIn(boardIds).stream()
                .collect(Collectors.groupingBy(BingoCell::getBoardId));
        Map<Long, Mission> missionsById = getMissionsById(cellsByBoardId.values().stream()
                .flatMap(List::stream)
                .toList());

        return boards.stream()
                .map(board -> {
                    List<BingoCell> cells = cellsByBoardId.getOrDefault(board.getId(), List.of()).stream()
                            .sorted(Comparator.comparingInt(BingoCell::getRow)
                                    .thenComparingInt(BingoCell::getCol))
                            .toList();
                    List<GameResultBingoCellResponse> cellResponses = cells.stream()
                            .map(cell -> GameResultBingoCellResponse.of(cell, getMission(missionsById, cell)))
                            .toList();
                    return GameResultBingoBoardResponse.of(
                            board,
                            getBoardOwners(room, board, participants, membersById),
                            BingoLineCounter.countCompletedLines(board.getBoardSize(), cells),
                            countApprovedCells(cells),
                            cellResponses
                    );
                })
                .toList();
    }

    private Map<Long, Mission> getMissionsById(List<BingoCell> cells) {
        List<Long> missionIds = cells.stream()
                .map(BingoCell::getMissionId)
                .distinct()
                .toList();
        return missionRepository.findAllById(missionIds).stream()
                .collect(Collectors.toMap(Mission::getId, Function.identity()));
    }

    private List<GameResultBoardOwnerResponse> getBoardOwners(
            Room room,
            BingoBoard board,
            List<GameResultParticipant> participants,
            Map<Long, Member> membersById
    ) {
        if (room.getMode() == GameMode.BATTLE) {
            if (board.getRoomMember() == null) {
                throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
            }
            return List.of(GameResultBoardOwnerResponse.from(
                    getMember(membersById, board.getRoomMember().getMemberId())
            ));
        }
        return participants.stream()
                .map(participant -> GameResultBoardOwnerResponse.from(
                        getMember(membersById, participant.getMemberId())
                ))
                .toList();
    }

    private Mission getMission(Map<Long, Mission> missionsById, BingoCell cell) {
        Mission mission = missionsById.get(cell.getMissionId());
        if (mission == null) {
            throw new CustomException(ErrorCode.MISSION_NOT_FOUND);
        }
        return mission;
    }

    private int countApprovedCells(List<BingoCell> cells) {
        return (int) cells.stream()
                .filter(cell -> cell.getCompletedAt() != null)
                .count();
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
