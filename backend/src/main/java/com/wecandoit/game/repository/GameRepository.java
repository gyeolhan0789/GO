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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select g
            from Game g
            where g.roomId = :roomId
              and g.status = :status
            order by g.id desc
            limit 1
            """)
    Optional<Game> findActiveGameForUpdate(
            @Param("roomId") Long roomId,
            @Param("status") GameStatus status
    );

    Optional<Game> findFirstByRoomIdOrderByIdDesc(Long roomId);

    List<Game> findAllByRoomIdIn(List<Long> roomIds);

    List<Game> findAllByRoomIdInAndStatus(List<Long> roomIds, GameStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM Game g WHERE g.id = :gameId")
    Optional<Game> findByIdForUpdate(@Param("gameId") Long gameId);
}
