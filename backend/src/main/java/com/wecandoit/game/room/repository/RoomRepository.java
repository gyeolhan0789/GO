package com.wecandoit.game.room.repository;

import com.wecandoit.game.room.domain.Room;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, Long> {
}
