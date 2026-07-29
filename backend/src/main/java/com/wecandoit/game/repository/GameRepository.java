package com.wecandoit.game.repository;

import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRepository extends JpaRepository<Game, Long> {

    Optional<Game> findFirstByRoomIdAndStatusOrderByIdDesc(Long roomId, GameStatus status);

    List<Game> findAllByRoomIdInAndStatus(List<Long> roomIds, GameStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM Game g WHERE g.id = :gameId")
    Optional<Game> findByIdForUpdate(@Param("gameId") Long gameId);
}
