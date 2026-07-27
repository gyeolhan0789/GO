package com.wecandoit.game.room.repository;

import com.wecandoit.game.room.domain.GameRoomStatus;
import com.wecandoit.game.room.domain.GameMode;
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

    List<Room> findAllByModeAndStatus(GameMode mode, GameRoomStatus status);

    @Query("""
            select r from Room r
            join RoomMember rm on rm.roomId = r.id
            where rm.memberId = :memberId
              and r.mode = :mode
              and r.status = :status
            order by r.id desc
            """)
    Optional<Room> findFirstByMemberIdAndModeAndStatus(
            @Param("memberId") Long memberId,
            @Param("mode") GameMode mode,
            @Param("status") GameRoomStatus status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.id = :roomId")
    Optional<Room> findByIdForUpdate(@Param("roomId") Long roomId);
}
