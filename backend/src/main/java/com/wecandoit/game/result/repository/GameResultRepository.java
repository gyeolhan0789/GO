package com.wecandoit.game.result.repository;

import com.wecandoit.game.result.domain.GameResult;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameResultRepository extends JpaRepository<GameResult, Long> {

    Optional<GameResult> findByRoomId(Long roomId);

    Slice<GameResult> findByRoomIdInOrderByCreatedAtDesc(List<Long> roomIds, Pageable pageable);
}
