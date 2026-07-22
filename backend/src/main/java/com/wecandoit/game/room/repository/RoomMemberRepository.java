package com.wecandoit.game.room.repository;

import com.wecandoit.game.room.domain.RoomMember;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {

    boolean existsByRoomIdAndMemberId(Long roomId, Long memberId);

    List<RoomMember> findAllByRoomIdOrderByJoinedAtAsc(Long roomId);
}
