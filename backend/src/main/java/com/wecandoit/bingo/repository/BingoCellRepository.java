package com.wecandoit.bingo.repository;

import com.wecandoit.bingo.domain.BingoCell;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BingoCellRepository extends JpaRepository<BingoCell, Long> {

    List<BingoCell> findAllByBoardId(Long boardId);
}
