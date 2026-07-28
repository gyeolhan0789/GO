package com.wecandoit.game.repository;

import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRepository extends JpaRepository<Game, Long> {

    Optional<Game> findFirstByRoomIdAndStatusOrderByIdDesc(Long roomId, GameStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT g
            FROM Game g
            WHERE g.roomId = :roomId
              AND g.status = :status
            ORDER BY g.id DESC
            LIMIT 1
            """)
    Optional<Game> findActiveGameForUpdate(
            @Param("roomId") Long roomId,
            @Param("status") GameStatus status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM Game g WHERE g.id = :gameId")
    Optional<Game> findByIdForUpdate(@Param("gameId") Long gameId);
}
