package com.wecandoit.game.room.repository;

import com.wecandoit.game.room.domain.RoomMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {

    boolean existsByRoomIdAndMemberId(Long roomId, Long memberId);

    Optional<RoomMember> findByRoomIdAndMemberId(Long roomId, Long memberId);

    long countByRoomId(Long roomId);

    List<RoomMember> findAllByRoomIdOrderByJoinedAtAsc(Long roomId);

    List<RoomMember> findAllByMemberIdOrderByJoinedAtDesc(Long memberId);

    List<RoomMember> findAllByRoomIdInOrderByJoinedAtAsc(List<Long> roomIds);

    void deleteAllByRoomId(Long roomId);
}
