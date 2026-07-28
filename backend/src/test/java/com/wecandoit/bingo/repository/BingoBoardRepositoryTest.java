package com.wecandoit.bingo.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.game.domain.RoomMember;
import com.wecandoit.game.repository.RoomMemberRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("빙고판 저장소")
class BingoBoardRepositoryTest {

    @Autowired
    private BingoBoardRepository bingoBoardRepository;
    @Autowired
    private RoomMemberRepository roomMemberRepository;

    @Test
    @DisplayName("대결 방의 참가자별 빙고판을 조회한다")
    void findAllByRoomIdReturnsBattleBoardsWithOwners() {
        // given
        RoomMember hostMember = roomMemberRepository.save(RoomMember.create(10L, 1L));
        RoomMember guestMember = roomMemberRepository.save(RoomMember.create(10L, 2L));
        bingoBoardRepository.save(BingoBoard.createForBattle(10L, hostMember, 3));
        bingoBoardRepository.save(BingoBoard.createForBattle(10L, guestMember, 3));
        bingoBoardRepository.save(BingoBoard.create(20L, 3));
        bingoBoardRepository.flush();

        // when
        var boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(10L).stream()
                .filter(board -> board.getRoomMember() != null)
                .toList();

        // then
        assertThat(boards).extracting(board -> board.getRoomMember().getId())
                .containsExactlyInAnyOrder(hostMember.getId(), guestMember.getId());
    }

    @Test
    @DisplayName("동일한 게임방 참가자에게 개인 빙고판을 중복 저장할 수 없다")
    void saveRejectsDuplicateBattleBoardOwner() {
        // given
        RoomMember roomMember = roomMemberRepository.save(RoomMember.create(10L, 1L));
        bingoBoardRepository.saveAndFlush(BingoBoard.createForBattle(10L, roomMember, 3));

        // when & then
        assertThatThrownBy(() ->
                bingoBoardRepository.saveAndFlush(BingoBoard.createForBattle(10L, roomMember, 3)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("기존 공용 빙고판은 소유자 없이 여러 판을 저장할 수 있다")
    void saveAllowsMultipleSharedBoardsWithoutOwner() {
        // given
        bingoBoardRepository.save(BingoBoard.create(10L, 3));
        bingoBoardRepository.save(BingoBoard.create(10L, 3));

        // when
        bingoBoardRepository.flush();

        // then
        assertThat(bingoBoardRepository.findAllByGameIdOrderByIdAsc(10L))
                .allMatch(board -> board.getRoomMember() == null);
    }

    @Test
    void allowsMultipleBoardsToReferenceTheSameGame() {
        BingoBoard firstBoard = bingoBoardRepository.save(BingoBoard.create(200L, 3));
        BingoBoard secondBoard = bingoBoardRepository.save(BingoBoard.create(200L, 3));

        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(200L);

        assertThat(boards)
                .extracting(BingoBoard::getId)
                .containsExactly(firstBoard.getId(), secondBoard.getId());
    }
}
