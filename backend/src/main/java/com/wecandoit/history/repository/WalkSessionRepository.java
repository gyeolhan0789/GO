package com.wecandoit.history.repository;

import com.wecandoit.history.domain.WalkSession;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalkSessionRepository extends JpaRepository<WalkSession, Long> {

    Optional<WalkSession> findByMemberIdAndClientSessionKey(Long memberId, String clientSessionKey);

    boolean existsByMemberIdAndClientSessionKey(Long memberId, String clientSessionKey);

    Slice<WalkSession> findAllByMemberIdOrderByEndedAtDescIdDesc(Long memberId, Pageable pageable);

    Slice<WalkSession> findAllByMemberIdAndRoomIdOrderByEndedAtDescIdDesc(
            Long memberId,
            Long roomId,
            Pageable pageable
    );

    @Query("""
            SELECT COALESCE(SUM(walkSession.step), 0)
            FROM WalkSession walkSession
            WHERE walkSession.roomId = :roomId
              AND walkSession.initialBingoBoardId = :bingoBoardId
              AND walkSession.memberId IN :memberIds
            """)
    long sumStepByRoomIdAndInitialBingoBoardIdAndMemberIds(
            @Param("roomId") Long roomId,
            @Param("bingoBoardId") Long bingoBoardId,
            @Param("memberIds") List<Long> memberIds
    );
}
