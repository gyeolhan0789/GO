package com.wecandoit.game.room.repository;

import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.Room;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findAllByStatus(GameRoomStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.id = :roomId")
    Optional<Room> findByIdForUpdate(@Param("roomId") Long roomId);
}
