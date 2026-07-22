package com.wecandoit.game.request.repository;

import com.wecandoit.common.status.RequestStatus;
import com.wecandoit.game.request.domain.GameRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRequestRepository extends JpaRepository<GameRequest, Long> {

    Optional<GameRequest> findFirstByRoomIdAndInviteeIdAndStatusOrderByCreatedAtDesc(
            Long roomId,
            Long inviteeId,
            RequestStatus status
    );

    List<GameRequest> findAllByInviteeIdAndStatusOrderByCreatedAtDesc(
            Long inviteeId,
            RequestStatus status
    );
}
