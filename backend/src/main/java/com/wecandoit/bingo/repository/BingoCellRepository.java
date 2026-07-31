package com.wecandoit.bingo.repository;

import com.wecandoit.bingo.domain.BingoCell;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BingoCellRepository extends JpaRepository<BingoCell, Long> {

    List<BingoCell> findAllByBoardId(Long boardId);

    List<BingoCell> findAllByBoardIdIn(List<Long> boardIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from BingoCell c where c.id = :cellId")
    Optional<BingoCell> findByIdForUpdate(@Param("cellId") Long cellId);

}
