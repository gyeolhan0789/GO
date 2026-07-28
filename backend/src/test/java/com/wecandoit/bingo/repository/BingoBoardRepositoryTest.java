package com.wecandoit.bingo.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.bingo.domain.BingoBoard;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class BingoBoardRepositoryTest {

    @Autowired
    private BingoBoardRepository bingoBoardRepository;

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
