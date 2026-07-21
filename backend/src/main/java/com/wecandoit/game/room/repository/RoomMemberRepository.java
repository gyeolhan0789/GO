package com.wecandoit.game.room.repository;

import com.wecandoit.game.room.domain.RoomMember;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {
}
