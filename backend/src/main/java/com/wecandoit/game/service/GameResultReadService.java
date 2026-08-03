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
import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.domain.GameResult;
import com.wecandoit.game.domain.GameResultParticipant;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.repository.GameParticipantRepository;
import com.wecandoit.game.repository.GameRepository;
import com.wecandoit.game.repository.GameResultParticipantRepository;
import com.wecandoit.game.repository.GameResultRepository;
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
    private final GameParticipantRepository gameParticipantRepository;
    private final GameRepository gameRepository;
    private final RoomRepository roomRepository;
    private final MemberRepository memberRepository;
    private final BingoBoardRepository bingoBoardRepository;
    private final BingoCellRepository bingoCellRepository;
    private final MissionRepository missionRepository;

    public GameResultDetailResponse getGameResult(Long memberId, Long gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_FOUND));
        Room room = roomRepository.findById(game.getRoomId())
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_NOT_FOUND));
        GameResult gameResult = gameResultRepository.findByGameId(gameId)
                .orElseThrow(() -> new CustomException(ErrorCode.GAME_NOT_COMPLETED));
        List<GameResultParticipant> participants =
                gameResultParticipantRepository.findAllByGameIdOrderByIdAsc(gameResult.getGameId());
        GameResultParticipant myParticipant = getMyParticipant(memberId, participants);
        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(gameResult.getGameId());
        if (boards.isEmpty()) {
            throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
        }
        Map<Long, GameParticipant> gameParticipantsById = gameParticipantRepository
                .findAllByGameIdOrderByJoinedAtAsc(gameId)
                .stream()
                .collect(Collectors.toMap(GameParticipant::getId, Function.identity()));
        Map<Long, Member> membersById = getMembersById(participants);
        List<GameResultParticipantResponse> participantResponses =
                toParticipantResponses(participants, membersById);
        List<GameResultBingoBoardResponse> bingoBoardResponses =
                toBingoBoardResponses(room, boards, participants, gameParticipantsById, membersById);

        return GameResultDetailResponse.of(
                gameResult,
                room,
                getBoardSize(boards),
                getTargetBingoCount(boards),
                getTargetStepCount(room, boards),
                game.getStartedAt(),
                game.getCompletedAt(),
                getTotalMissionCount(bingoBoardResponses),
                myParticipant,
                participantResponses,
                bingoBoardResponses
        );
    }

    public SliceResponse<GameResultResponse> getMyGameResults(Long memberId, Pageable pageable) {
        Slice<GameResult> gameResults =
                gameResultRepository.findAllByParticipantMemberIdOrderByCreatedAtDescIdDesc(memberId, pageable);
        if (gameResults.isEmpty()) {
            return SliceResponse.from(new SliceImpl<>(List.of(), pageable, false));
        }
        List<Long> gameIds = gameResults.getContent().stream()
                .map(GameResult::getGameId)
                .toList();
        Map<Long, Room> roomsById = roomRepository.findAllById(gameResults.getContent().stream()
                        .map(GameResult::getRoomId)
                        .toList())
                .stream()
                .collect(Collectors.toMap(Room::getId, Function.identity()));
        Map<Long, Game> gamesById = gameRepository.findAllById(gameIds).stream()
                .collect(Collectors.toMap(Game::getId, Function.identity()));

        List<GameResultParticipant> participants = gameResultParticipantRepository.findAllByGameIdInOrderByIdAsc(
                gameIds
        );
        Map<Long, List<GameResultParticipant>> participantsByGameId = participants.stream()
                .collect(Collectors.groupingBy(GameResultParticipant::getGameId));
        Map<Long, Member> membersById = memberRepository.findAllById(participants.stream()
                        .map(GameResultParticipant::getMemberId)
                        .distinct()
                        .toList())
                .stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdInOrderByIdAsc(gameIds);
        Map<Long, List<BingoBoard>> boardsByGameId = boards.stream()
                .collect(Collectors.groupingBy(BingoBoard::getGameId));
        Map<Long, Integer> cellCountsByBoardId = getCellCountsByBoardId(boards);

        return SliceResponse.from(gameResults.map(gameResult -> {
            Room room = getRoom(roomsById, gameResult.getRoomId());
            Game game = getGame(gamesById, gameResult.getGameId());
            List<BingoBoard> resultBoards = boardsByGameId.getOrDefault(gameResult.getGameId(), List.of());
            List<GameResultParticipant> resultParticipants =
                    participantsByGameId.getOrDefault(gameResult.getGameId(), List.of());
            return GameResultResponse.of(
                    gameResult,
                    room,
                    getBoardSize(resultBoards),
                    getTargetBingoCount(resultBoards),
                    getTargetStepCount(room, resultBoards),
                    game.getStartedAt(),
                    game.getCompletedAt(),
                    getTotalMissionCount(resultBoards, cellCountsByBoardId),
                    getMyParticipant(memberId, resultParticipants),
                    toParticipantResponses(resultParticipants, membersById)
            );
        }));
    }

    private Map<Long, Integer> getCellCountsByBoardId(List<BingoBoard> boards) {
        List<Long> boardIds = boards.stream().map(BingoBoard::getId).toList();
        if (boardIds.isEmpty()) {
            return Map.of();
        }
        return bingoCellRepository.findAllByBoardIdIn(boardIds).stream()
                .collect(Collectors.groupingBy(
                        BingoCell::getBoardId,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));
    }

    private Integer getTargetStepCount(Room room, List<BingoBoard> boards) {
        if (room.getMode() == GameMode.BATTLE) {
            return null;
        }
        return boards.stream()
                .filter(BingoBoard::isShared)
                .max(Comparator.comparing(BingoBoard::getId))
                .map(BingoBoard::getTargetStepCount)
                .orElse(null);
    }

    private int getBoardSize(List<BingoBoard> boards) {
        return getConfigurationBoard(boards).getBoardSize();
    }

    private Integer getTargetBingoCount(List<BingoBoard> boards) {
        return getConfigurationBoard(boards).getTargetBingoCount();
    }

    private BingoBoard getConfigurationBoard(List<BingoBoard> boards) {
        return boards.stream()
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND));
    }

    private int getTotalMissionCount(List<BingoBoard> boards, Map<Long, Integer> cellCountsByBoardId) {
        return boards.stream()
                .mapToInt(board -> cellCountsByBoardId.getOrDefault(board.getId(), 0))
                .sum();
    }

    private int getTotalMissionCount(List<GameResultBingoBoardResponse> bingoBoardResponses) {
        return bingoBoardResponses.stream()
                .mapToInt(GameResultBingoBoardResponse::totalCellCount)
                .sum();
    }

    private Room getRoom(Map<Long, Room> roomsById, Long roomId) {
        Room room = roomsById.get(roomId);
        if (room == null) {
            throw new CustomException(ErrorCode.ROOM_NOT_FOUND);
        }
        return room;
    }

    private Game getGame(Map<Long, Game> gamesById, Long gameId) {
        Game game = gamesById.get(gameId);
        if (game == null) {
            throw new CustomException(ErrorCode.GAME_NOT_FOUND);
        }
        return game;
    }

    private GameResultParticipant getMyParticipant(
            Long memberId,
            List<GameResultParticipant> participants
    ) {
        return participants.stream()
                .filter(participant -> participant.getMemberId().equals(memberId))
                .findFirst()
                .orElseThrow(() -> new CustomException(ErrorCode.ROOM_MEMBER_FORBIDDEN));
    }

    private Map<Long, Member> getMembersById(List<GameResultParticipant> participants) {
        List<Long> memberIds = participants.stream()
                .map(GameResultParticipant::getMemberId)
                .distinct()
                .toList();
        return memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
    }

    private List<GameResultBingoBoardResponse> toBingoBoardResponses(
            Room room,
            List<BingoBoard> boards,
            List<GameResultParticipant> participants,
            Map<Long, GameParticipant> gameParticipantsById,
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
                            getBoardOwners(room, board, participants, gameParticipantsById, membersById),
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
            Map<Long, GameParticipant> gameParticipantsById,
            Map<Long, Member> membersById
    ) {
        if (room.getMode() == GameMode.BATTLE) {
            if (!board.isPersonal()) {
                throw new CustomException(ErrorCode.BINGO_BOARD_NOT_FOUND);
            }
            GameParticipant gameParticipant = gameParticipantsById.get(board.getGameParticipantId());
            if (gameParticipant == null) {
                throw new CustomException(ErrorCode.GAME_PARTICIPANT_NOT_FOUND);
            }
            return List.of(GameResultBoardOwnerResponse.from(
                    getMember(membersById, gameParticipant.getMemberId())
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
