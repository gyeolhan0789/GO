package com.wecandoit.bingo.repository;

import com.wecandoit.bingo.domain.BingoCell;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BingoCellRepository extends JpaRepository<BingoCell, Long> {

    List<BingoCell> findAllByBoardId(Long boardId);

    boolean existsByBoardIdAndCompletedAtIsNull(Long boardId);

    Optional<BingoCell> findByBoardIdAndRowAndCol(Long boardId, int row, int col);
}
