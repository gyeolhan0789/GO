package com.wecandoit.friend.repository;

import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.domain.FriendRequestStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    @Query("""
            select fr from FriendRequest fr
            where fr.status = com.wecandoit.friend.domain.FriendRequestStatus.PENDING
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
    @Query("""
            select fr from FriendRequest fr
            where fr.invitee.id = :inviteeId
              and fr.status = :status
            order by fr.createdAt desc, fr.id desc
            """)
    Slice<FriendRequest> findAllByInviteeIdAndStatusOrderByCreatedAtDescIdDesc(
            @Param("inviteeId") Long inviteeId,
            @Param("status") FriendRequestStatus status,
            Pageable pageable
    );

    @Query("""
            select fr from FriendRequest fr
            join fetch fr.invitee
            where fr.inviter.id = :inviterId
              and fr.status = com.wecandoit.friend.domain.FriendRequestStatus.PENDING
              and not exists (
                    select f.id from Friend f
                    where (f.member1.id = fr.inviter.id and f.member2.id = fr.invitee.id)
                       or (f.member2.id = fr.inviter.id and f.member1.id = fr.invitee.id)
              )
            order by fr.createdAt desc, fr.id desc
            """)
    Slice<FriendRequest> findPendingSentRequests(
            @Param("inviterId") Long inviterId,
            Pageable pageable
    );

    @Query("""
            select fr from FriendRequest fr
            join fetch fr.invitee
            where fr.inviter.id = :inviterId
              and fr.status = com.wecandoit.friend.domain.FriendRequestStatus.PENDING
              and not exists (
                    select f.id from Friend f
                    where (f.member1.id = fr.inviter.id and f.member2.id = fr.invitee.id)
                       or (f.member2.id = fr.inviter.id and f.member1.id = fr.invitee.id)
              )
            order by fr.createdAt desc, fr.id desc
            """)
    List<FriendRequest> findPendingSentRequests(@Param("inviterId") Long inviterId);

    @EntityGraph(attributePaths = {"inviter", "invitee"})
    @Query("""
            select fr from FriendRequest fr
            where fr.status = com.wecandoit.friend.domain.FriendRequestStatus.PENDING
              and ((fr.inviter.id = :memberId and fr.invitee.id in :candidateIds)
                or (fr.invitee.id = :memberId and fr.inviter.id in :candidateIds))
            """)
    List<FriendRequest> findPendingRelatedTo(
            @Param("memberId") Long memberId,
            @Param("candidateIds") Collection<Long> candidateIds
    );
}
