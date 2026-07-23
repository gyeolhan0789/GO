package com.wecandoit.history.repository;

import com.wecandoit.history.domain.MemberHistory;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberHistoryRepository extends JpaRepository<MemberHistory, Long> {

    Optional<MemberHistory> findByMemberIdAndHistoryDate(Long memberId, LocalDate historyDate);

    List<MemberHistory> findAllByMemberIdAndHistoryDateBetweenOrderByHistoryDateAsc(
            Long memberId,
            LocalDate startDate,
            LocalDate endDate
    );
}
