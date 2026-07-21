package com.wecandoit.backend.friendrequest.repository;

import com.wecandoit.backend.friendrequest.domain.FriendRequest;
import com.wecandoit.backend.friendrequest.domain.FriendRequestStatus;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    @Query("""
            select fr from FriendRequest fr
            where fr.status = com.wecandoit.backend.friendrequest.domain.FriendRequestStatus.PENDING
              and ((fr.inviter.id = :firstMemberId and fr.invitee.id = :secondMemberId)
                or (fr.inviter.id = :secondMemberId and fr.invitee.id = :firstMemberId))
            """)
    Optional<FriendRequest> findPendingBetween(
            @Param("firstMemberId") Long firstMemberId,
            @Param("secondMemberId") Long secondMemberId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"inviter", "invitee"})
    @Query("select fr from FriendRequest fr where fr.id = :requestId")
    Optional<FriendRequest> findByIdForUpdate(@Param("requestId") Long requestId);

    @EntityGraph(attributePaths = "inviter")
    List<FriendRequest> findAllByInviteeIdAndStatusOrderByCreatedAtDesc(
            Long inviteeId,
            FriendRequestStatus status
    );

    @EntityGraph(attributePaths = {"inviter", "invitee"})
    @Query("""
            select fr from FriendRequest fr
            where fr.status = com.wecandoit.backend.friendrequest.domain.FriendRequestStatus.PENDING
              and ((fr.inviter.id = :memberId and fr.invitee.id in :candidateIds)
                or (fr.invitee.id = :memberId and fr.inviter.id in :candidateIds))
            """)
    List<FriendRequest> findPendingRelatedTo(
            @Param("memberId") Long memberId,
            @Param("candidateIds") Collection<Long> candidateIds
    );
}
