package com.wecandoit.game.repository;

import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.domain.GameRequest;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRequestRepository extends JpaRepository<GameRequest, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select gr from GameRequest gr where gr.id = :requestId")
    Optional<GameRequest> findByIdForUpdate(@Param("requestId") Long requestId);

    Optional<GameRequest> findFirstByRoomIdAndInviteeIdAndStatusOrderByCreatedAtDesc(
            Long roomId,
            Long inviteeId,
            RequestStatus status
    );

    List<GameRequest> findAllByInviteeIdAndStatusOrderByCreatedAtDesc(
            Long inviteeId,
            RequestStatus status
    );

    List<GameRequest> findAllByInviterIdAndStatusOrderByCreatedAtDesc(
            Long inviterId,
            RequestStatus status
    );
}
