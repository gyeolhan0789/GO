package com.wecandoit.game.repository;

import com.wecandoit.game.domain.GameResult;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameResultRepository extends JpaRepository<GameResult, Long> {

    Optional<GameResult> findByGameId(Long gameId);

    Optional<GameResult> findFirstByRoomIdOrderByCreatedAtDescIdDesc(Long roomId);

    Slice<GameResult> findByRoomIdInOrderByCreatedAtDesc(List<Long> roomIds, Pageable pageable);
}
