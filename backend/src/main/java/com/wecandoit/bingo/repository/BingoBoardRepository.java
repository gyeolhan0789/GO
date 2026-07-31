package com.wecandoit.bingo.repository;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BingoBoardRepository extends JpaRepository<BingoBoard, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BingoBoard b WHERE b.id = :boardId")
    Optional<BingoBoard> findByIdForUpdate(@Param("boardId") Long boardId);

    boolean existsByGameParticipantId(Long gameParticipantId);

    Optional<BingoBoard> findFirstByGameIdAndStatusNotInOrderByIdDesc(
            Long gameId,
            List<BingoBoardStatus> excludedStatuses
    );

    List<BingoBoard> findAllByGameIdInAndStatusNotInOrderByIdAsc(
            List<Long> gameIds,
            List<BingoBoardStatus> excludedStatuses
    );

    List<BingoBoard> findAllByGameIdInOrderByIdAsc(List<Long> gameIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT b FROM BingoBoard b
            WHERE b.gameId = :gameId
              AND b.status NOT IN :excludedStatuses
            ORDER BY b.id DESC
            LIMIT 1
            """)
    Optional<BingoBoard> findActiveBoardForUpdate(
            @Param("gameId") Long gameId,
            @Param("excludedStatuses") List<BingoBoardStatus> excludedStatuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT b FROM BingoBoard b
            WHERE b.gameId = :gameId
              AND b.gameParticipantId = :gameParticipantId
              AND b.status NOT IN :excludedStatuses
            ORDER BY b.id DESC
            LIMIT 1
            """)
    Optional<BingoBoard> findActiveBoardForUpdate(
            @Param("gameId") Long gameId,
            @Param("gameParticipantId") Long gameParticipantId,
            @Param("excludedStatuses") List<BingoBoardStatus> excludedStatuses
    );

    List<BingoBoard> findAllByGameIdOrderByIdAsc(Long gameId);
}
