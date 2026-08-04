package com.wecandoit.game.repository;

import com.wecandoit.game.domain.Game;
import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.GameStatus;
import com.wecandoit.game.domain.RoomStatus;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
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

    @Query("""
            select g
            from Game g
            join Room r on r.id = g.roomId
            where g.status = :status
              and r.status = :roomStatus
              and r.mode in :modes
              and g.startedAt <= :startedAt
            order by g.id asc
            """)
    List<Game> findAllRenewalNotificationTargets(
            @Param("status") GameStatus status,
            @Param("roomStatus") RoomStatus roomStatus,
            @Param("modes") List<GameMode> modes,
            @Param("startedAt") LocalDateTime startedAt
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM Game g WHERE g.id = :gameId")
    Optional<Game> findByIdForUpdate(@Param("gameId") Long gameId);

    @Query("SELECT g.roomId FROM Game g WHERE g.id = :gameId")
    Optional<Long> findRoomIdById(@Param("gameId") Long gameId);
}
