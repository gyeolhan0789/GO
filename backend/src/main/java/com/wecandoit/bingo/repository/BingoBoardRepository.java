package com.wecandoit.bingo.repository;

import com.wecandoit.bingo.domain.BingoBoard;
import com.wecandoit.bingo.domain.BingoBoardStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BingoBoardRepository extends JpaRepository<BingoBoard, Long> {

    boolean existsByRoomId(Long roomId);

    Optional<BingoBoard> findFirstByRoomIdAndStatusNotInOrderByIdDesc(Long roomId, List<BingoBoardStatus> excludedStatuses);
}
