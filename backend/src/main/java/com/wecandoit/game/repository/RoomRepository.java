package com.wecandoit.game.repository;

import com.wecandoit.game.domain.GameMode;
import com.wecandoit.game.domain.Room;
import com.wecandoit.game.domain.RoomStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findAllByStatus(RoomStatus status);

    List<Room> findAllByModeAndStatus(GameMode mode, RoomStatus status);

    Optional<Room> findFirstByHostIdAndModeAndStatusOrderByIdDesc(
            Long hostId,
            GameMode mode,
            RoomStatus status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.id = :roomId")
    Optional<Room> findByIdForUpdate(@Param("roomId") Long roomId);
}
