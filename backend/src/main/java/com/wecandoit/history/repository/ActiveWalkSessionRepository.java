package com.wecandoit.history.repository;

import com.wecandoit.history.domain.ActiveWalkSession;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActiveWalkSessionRepository extends JpaRepository<ActiveWalkSession, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ActiveWalkSession s where s.memberId = :memberId")
    Optional<ActiveWalkSession> findByMemberIdForUpdate(@Param("memberId") Long memberId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ActiveWalkSession s where s.memberId = :memberId and s.walkSessionKey = :walkSessionKey")
    Optional<ActiveWalkSession> findByMemberIdAndWalkSessionKeyForUpdate(
            @Param("memberId") Long memberId,
            @Param("walkSessionKey") String walkSessionKey
    );

    Optional<ActiveWalkSession> findByMemberIdAndWalkSessionKey(Long memberId, String walkSessionKey);

    @Modifying
    @Query("delete from ActiveWalkSession s where s.roomId = :roomId")
    void deleteAllByRoomId(@Param("roomId") Long roomId);

    @Modifying
    @Query("delete from ActiveWalkSession s where s.expiresAt <= :now")
    void deleteAllExpired(@Param("now") Instant now);
}
