package com.wecandoit.history.repository;

import com.wecandoit.history.domain.WalkSession;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WalkSessionRepository extends JpaRepository<WalkSession, Long> {

    Optional<WalkSession> findByMemberIdAndClientSessionKey(Long memberId, String clientSessionKey);

    boolean existsByMemberIdAndClientSessionKey(Long memberId, String clientSessionKey);

    Slice<WalkSession> findAllByMemberIdOrderByEndedAtDescIdDesc(Long memberId, Pageable pageable);

    Slice<WalkSession> findAllByMemberIdAndRoomIdOrderByEndedAtDescIdDesc(
            Long memberId,
            Long roomId,
            Pageable pageable
    );
}
