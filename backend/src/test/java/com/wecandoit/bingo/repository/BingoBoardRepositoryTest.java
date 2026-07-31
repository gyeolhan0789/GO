package com.wecandoit.bingo.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardType;
import com.wecandoit.game.domain.GameParticipant;
import com.wecandoit.game.repository.GameParticipantRepository;
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
    private GameParticipantRepository gameParticipantRepository;

    @Test
    @DisplayName("대결 게임의 참가자별 빙고판을 조회한다")
    void findAllByGameIdReturnsBattleBoardsWithOwners() {
        GameParticipant host = gameParticipantRepository.save(GameParticipant.create(10L, 1L));
        GameParticipant guest = gameParticipantRepository.save(GameParticipant.create(10L, 2L));
        bingoBoardRepository.save(BingoBoard.createForBattle(10L, host.getId(), 3, 3));
        bingoBoardRepository.save(BingoBoard.createForBattle(10L, guest.getId(), 3, 3));
        bingoBoardRepository.flush();

        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(10L);

        assertThat(boards)
                .extracting(BingoBoard::getGameParticipantId)
                .containsExactly(host.getId(), guest.getId());
        assertThat(boards).extracting(BingoBoard::getType)
                .containsOnly(BingoBoardType.PERSONAL);
    }

    @Test
    @DisplayName("같은 게임 참가자의 개인 빙고판은 중복 저장할 수 없다")
    void saveRejectsDuplicateBattleBoardOwner() {
        GameParticipant participant =
                gameParticipantRepository.save(GameParticipant.create(10L, 1L));
        bingoBoardRepository.saveAndFlush(
                BingoBoard.createForBattle(10L, participant.getId(), 3, 3));

        assertThatThrownBy(() -> bingoBoardRepository.saveAndFlush(
                BingoBoard.createForBattle(10L, participant.getId(), 3, 3)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("공유 빙고판은 소유자 없이 저장한다")
    void saveSharedBoardWithoutOwner() {
        BingoBoard board = bingoBoardRepository.saveAndFlush(
                BingoBoard.create(10L, 3, 2, 12_000));

        assertThat(board.getGameParticipantId()).isNull();
        assertThat(board.getType()).isEqualTo(BingoBoardType.SHARED);
        assertThat(board.getTargetBingoCount()).isEqualTo(2);
        assertThat(board.getTargetStepCount()).isEqualTo(12_000);
    }

    @Test
    @DisplayName("동일한 게임을 참조하는 여러 빙고판을 저장할 수 있다")
    void allowsMultipleBoardsToReferenceTheSameGame() {
        BingoBoard firstBoard = bingoBoardRepository.save(BingoBoard.create(200L, 3));
        BingoBoard secondBoard = bingoBoardRepository.save(BingoBoard.create(200L, 3));

        List<BingoBoard> boards = bingoBoardRepository.findAllByGameIdOrderByIdAsc(200L);

        assertThat(boards)
                .extracting(BingoBoard::getId)
                .containsExactly(firstBoard.getId(), secondBoard.getId());
    }
}
