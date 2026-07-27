package com.wecandoit.history.repository;

import com.wecandoit.history.domain.MemberHistory;
import com.wecandoit.member.domain.Region;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberHistoryRepository extends JpaRepository<MemberHistory, Long> {

    Optional<MemberHistory> findByMemberIdAndHistoryDate(Long memberId, LocalDate historyDate);

    List<MemberHistory> findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(
            Long memberId,
            LocalDate startDate,
            LocalDate endDate
    );

    @Query("""
            select m.id as memberId,
                   m.nickname as nickname,
                   coalesce(sum(h.step), 0) as weeklySteps
            from Member m
            left join MemberHistory h
                   on h.memberId = m.id
                  and h.historyDate between :startDate and :endDate
            where m.region = :region
            group by m.id, m.nickname
            order by coalesce(sum(h.step), 0) desc, m.id asc
            """)
    List<WeeklyRankingSummary> findWeeklyRankingsByRegion(
            @Param("region") Region region,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("""
            select m.id as memberId,
                   m.nickname as nickname,
                   coalesce(sum(h.step), 0) as weeklySteps
            from Member m
            left join MemberHistory h
                   on h.memberId = m.id
                  and h.historyDate between :startDate and :endDate
            where m.id = :memberId
               or exists (
                    select f.id
                    from Friend f
                    where (f.member1.id = :memberId and f.member2.id = m.id)
                       or (f.member2.id = :memberId and f.member1.id = m.id)
               )
            group by m.id, m.nickname
            order by coalesce(sum(h.step), 0) desc, m.id asc
            """)
    List<WeeklyRankingSummary> findWeeklyFriendRankings(
            @Param("memberId") Long memberId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("""
            select m.id as memberId,
                   m.nickname as nickname,
                   coalesce(sum(h.step), 0) as weeklySteps
            from Member m
            left join MemberHistory h
                   on h.memberId = m.id
                  and h.historyDate between :startDate and :endDate
            where m.id in :memberIds
            group by m.id, m.nickname
            """)
    List<WeeklyRankingSummary> findWeeklyStepsByMemberIds(
            @Param("memberIds") Collection<Long> memberIds,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
