package com.wecandoit.cash.repository;

import com.wecandoit.cash.domain.CashHistory;
import com.wecandoit.cash.domain.CashHistoryType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashHistoryRepository extends JpaRepository<CashHistory, Long> {

    List<CashHistory> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId);

    boolean existsByMemberIdAndTypeAndReferenceId(Long memberId, CashHistoryType type, Long referenceId);

    boolean existsByTypeAndReferenceId(CashHistoryType type, Long referenceId);
}
