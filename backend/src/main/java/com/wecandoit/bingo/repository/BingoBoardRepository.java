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

    boolean existsByRoomId(Long roomId);

    Optional<BingoBoard> findFirstByRoomIdAndStatusNotInOrderByIdDesc(Long roomId, List<BingoBoardStatus> excludedStatuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BingoBoard b WHERE b.roomId = :roomId AND b.status NOT IN :excludedStatuses ORDER BY b.id DESC LIMIT 1")
    Optional<BingoBoard> findActiveBoardForUpdate(@Param("roomId") Long roomId, @Param("excludedStatuses") List<BingoBoardStatus> excludedStatuses);
}
