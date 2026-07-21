package com.wecandoit.friend.repository;

import com.wecandoit.friend.domain.Friend;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendRepository extends JpaRepository<Friend, Long> {

    @Query("""
            select count(f) > 0 from Friend f
            where (f.member1.id = :firstMemberId and f.member2.id = :secondMemberId)
               or (f.member1.id = :secondMemberId and f.member2.id = :firstMemberId)
            """)
    boolean existsBetween(
            @Param("firstMemberId") Long firstMemberId,
            @Param("secondMemberId") Long secondMemberId
    );

    @Query("""
            select f from Friend f
            where (f.member1.id = :firstMemberId and f.member2.id = :secondMemberId)
               or (f.member1.id = :secondMemberId and f.member2.id = :firstMemberId)
            """)
    Optional<Friend> findBetween(
            @Param("firstMemberId") Long firstMemberId,
            @Param("secondMemberId") Long secondMemberId
    );

    @EntityGraph(attributePaths = {"member1", "member2"})
    @Query("select f from Friend f where f.member1.id = :memberId or f.member2.id = :memberId")
    List<Friend> findAllByMemberId(@Param("memberId") Long memberId);

    @Query("""
            select case when f.member1.id = :memberId then f.member2.id else f.member1.id end
            from Friend f
            where (f.member1.id = :memberId and f.member2.id in :candidateIds)
               or (f.member2.id = :memberId and f.member1.id in :candidateIds)
            """)
    List<Long> findFriendMemberIds(
            @Param("memberId") Long memberId,
            @Param("candidateIds") Collection<Long> candidateIds
    );
}
